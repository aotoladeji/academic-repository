<?php

use App\Http\Controllers\AccountRequestController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExternalSearchController;
use App\Http\Controllers\FormFieldController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PublicationController;
use App\Http\Controllers\StaffController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureStaff;
use Illuminate\Support\Facades\Route;

/* ---------------- PUBLIC (no login) ---------------- */
Route::get('/form-fields', [FormFieldController::class, 'index']);
Route::get('/publications', [PublicationController::class, 'index']);
Route::get('/publications/{publication}', [PublicationController::class, 'show'])->whereNumber('publication');
Route::get('/external/similar', [ExternalSearchController::class, 'similar'])->middleware('throttle:20,1');

Route::post('/account-requests', [AccountRequestController::class, 'store'])->middleware('throttle:10,1');
Route::post('/staff/login', [AuthController::class, 'staffLogin'])->middleware('throttle:10,1');
Route::post('/admin/login', [AuthController::class, 'adminLogin'])->middleware('throttle:10,1');

/* ---------------- STAFF (signed in with PF number) ---------------- */
Route::middleware(['auth:sanctum', EnsureStaff::class])->group(function () {
    Route::get('/staff/me', [AuthController::class, 'staffMe']);
    Route::post('/staff/logout', [AuthController::class, 'logout']);
    Route::post('/staff/change-password', [AuthController::class, 'changePassword']);
    Route::post('/publications', [PublicationController::class, 'store'])->middleware('throttle:30,1');
});

/* ---------------- ADMIN ---------------- */
Route::prefix('admin')->middleware(['auth:sanctum', EnsureAdmin::class])->group(function () {
    Route::get('/me', [AuthController::class, 'adminMe']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Form builder
    Route::get('/form-fields', [FormFieldController::class, 'adminIndex']);
    Route::post('/form-fields', [FormFieldController::class, 'store']);
    Route::put('/form-fields/reorder', [FormFieldController::class, 'reorder']);
    Route::put('/form-fields/{formField}', [FormFieldController::class, 'update']);
    Route::delete('/form-fields/{formField}', [FormFieldController::class, 'destroy']);

    // Staff
    Route::get('/staff', [StaffController::class, 'index']);
    Route::post('/staff', [StaffController::class, 'store']);
    Route::post('/staff/import', [StaffController::class, 'import']);
    Route::get('/staff/{staff}', [StaffController::class, 'show']);
    Route::put('/staff/{staff}', [StaffController::class, 'update']);
    Route::put('/staff/{staff}/password', [StaffController::class, 'setPassword']);
    Route::delete('/staff/{staff}', [StaffController::class, 'destroy']);

    // Account requests
    Route::get('/account-requests', [AccountRequestController::class, 'index']);
    Route::post('/account-requests/{accountRequest}/approve', [AccountRequestController::class, 'approve']);
    Route::post('/account-requests/{accountRequest}/reject', [AccountRequestController::class, 'reject']);

    // Publications
    Route::post('/publications', [PublicationController::class, 'store']);
    Route::delete('/publications/{publication}', [PublicationController::class, 'destroy']);

    // Email to staff
    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages/preview', [MessageController::class, 'preview']);
    Route::post('/messages', [MessageController::class, 'store']);
});
