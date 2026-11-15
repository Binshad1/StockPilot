package com.stockpilot.app.data

import android.content.Context
import com.google.gson.Gson
import com.stockpilot.app.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

/** One method per REST endpoint of the StockPilot backend. */
interface StockPilotApi {
    @POST("api/auth/login") suspend fun login(@Body body: LoginRequest): AuthResponse
    @POST("api/auth/register") suspend fun register(@Body body: RegisterRequest): AuthResponse

    @GET("api/dashboard") suspend fun dashboard(): Dashboard

    @GET("api/products")
    suspend fun products(
        @Query("q") q: String?,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Page<Product>

    @POST("api/products") suspend fun addProduct(@Body body: NewProductRequest): Product

    @POST("api/inventory/stock-in") suspend fun stockIn(@Body body: StockRequest)
    @POST("api/inventory/stock-out") suspend fun stockOut(@Body body: StockRequest)

    @GET("api/customers")
    suspend fun customers(
        @Query("q") q: String?,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Page<Customer>

    @POST("api/customers") suspend fun addCustomer(@Body body: NewCustomerRequest): Customer

    @GET("api/orders")
    suspend fun orders(
        @Query("q") q: String?,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Page<Order>

    @POST("api/orders") suspend fun createOrder(@Body body: NewOrderRequest): Order

    @PATCH("api/orders/{id}/status")
    suspend fun setOrderStatus(@Path("id") id: String, @Body body: StatusRequest): Order
}

/** Stores the JWT and the signed-in user on the device. */
object Session {
    private const val FILE = "stockpilot_session"
    private val gson = Gson()

    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun save(c: Context, auth: AuthResponse) {
        prefs(c).edit().putString("token", auth.token).putString("user", gson.toJson(auth.user)).apply()
    }

    fun token(c: Context): String? = prefs(c).getString("token", null)

    fun user(c: Context): User? =
        prefs(c).getString("user", null)?.let { runCatching { gson.fromJson(it, User::class.java) }.getOrNull() }

    fun isAdmin(c: Context) = user(c)?.role == "admin"

    fun clear(c: Context) = prefs(c).edit().clear().apply()
}

object Net {
    @Volatile private var instance: StockPilotApi? = null

    fun api(context: Context): StockPilotApi =
        instance ?: synchronized(this) { instance ?: build(context.applicationContext).also { instance = it } }

    private fun build(app: Context): StockPilotApi {
        val auth = Interceptor { chain ->
            val b = chain.request().newBuilder()
            Session.token(app)?.let { b.header("Authorization", "Bearer $it") }
            chain.proceed(b.build())
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(auth)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
            })
            .connectTimeout(30, TimeUnit.SECONDS) // free hosts (e.g. Render) can take a while to wake up
            .readTimeout(45, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(StockPilotApi::class.java)
    }
}
