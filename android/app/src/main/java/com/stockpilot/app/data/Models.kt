package com.stockpilot.app.data

import com.google.gson.annotations.SerializedName

// ---- Responses (fields that may be missing in a response are nullable) ----
data class User(val id: String, val name: String, val email: String, val role: String)
data class AuthResponse(val token: String, val user: User)

data class Page<T>(val data: List<T>, val page: Int, val pages: Int, val total: Int)

data class Product(
    @SerializedName("_id") val id: String,
    val name: String,
    val sku: String,
    val category: String,
    val price: Double,
    val stock: Int,
    val lowStockThreshold: Int,
    val status: String?
)

data class Customer(
    @SerializedName("_id") val id: String,
    val name: String,
    val email: String?,
    val phone: String?,
    val address: String?,
    val orders: Int?,
    val totalSpent: Double?
)

data class OrderItem(val name: String, val sku: String, val price: Double, val quantity: Int)

data class Order(
    @SerializedName("_id") val id: String,
    val orderNumber: String,
    val customerName: String,
    val items: List<OrderItem>,
    val subtotal: Double,
    val discount: Double,
    val total: Double,
    val status: String,
    val createdAt: String
)

data class Totals(
    val completedOrders: Int?,
    val products: Int,
    val stockUnits: Int,
    val inventoryValue: Double,
    val lowStock: Int,
    val outOfStock: Int,
    val customers: Int,
    val orders: Int,
    val pendingOrders: Int,
    val revenueToday: Double,
    val revenueMonth: Double
)

data class SalesDay(val date: String, val revenue: Double, val orders: Int)
data class TopProduct(val name: String, val sku: String?, val quantity: Int, val revenue: Double?)
data class Dashboard(
    val totals: Totals,
    val lowStockItems: List<Product>,
    val sales: List<SalesDay>?,
    val topProducts: List<TopProduct>?
)

// ---- Reports (admin) ----
data class SalesSummary(val orders: Int, val revenue: Double, val discount: Double, val itemsSold: Int, val averageOrderValue: Double)
data class CategorySales(val category: String, val quantity: Int, val revenue: Double)
data class SalesReport(
    val summary: SalesSummary,
    val byDay: List<SalesDay>,
    val topProducts: List<TopProduct>,
    val byCategory: List<CategorySales>
)
data class InventorySummary(val products: Int, val units: Int, val value: Double, val lowStock: Int, val outOfStock: Int)
data class CategoryStock(val category: String, val products: Int, val units: Int, val value: Double)
data class InventoryReport(val summary: InventorySummary, val byCategory: List<CategoryStock>, val attention: List<Product>)

// ---- Team (admin) ----
data class TeamUser(val id: String, val name: String, val email: String, val role: String, val isActive: Boolean?, val createdAt: String?)

// ---- Requests ----
data class LoginRequest(val email: String, val password: String)
data class RegisterRequest(val name: String, val email: String, val password: String)
data class StockRequest(val productId: String, val quantity: Int, val reason: String, val note: String = "")
data class NewProductRequest(
    val name: String, val sku: String, val category: String,
    val price: Double, val stock: Int, val lowStockThreshold: Int
)
data class NewCustomerRequest(val name: String, val phone: String, val email: String, val address: String)
data class OrderLine(val productId: String, val quantity: Int)
data class NewOrderRequest(val customerId: String?, val items: List<OrderLine>, val discount: Double)
data class StatusRequest(val status: String)
data class UpdateProductRequest(val name: String, val sku: String, val category: String, val price: Double, val lowStockThreshold: Int)
data class PasswordRequest(val currentPassword: String, val newPassword: String)
data class NewUserRequest(val name: String, val email: String, val password: String, val role: String)
data class UserPatch(val role: String? = null, val isActive: Boolean? = null)
