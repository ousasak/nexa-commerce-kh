<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'Mini Shop Platform API (Laravel)',
        'version' => '1.0.0',
        'contact_telegram' => '@your_telegram',
    ]);
});

Route::options('/uploads/{path}', function () {
    return response('', 204, [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers' => '*',
    ]);
})->where('path', '.*');

Route::get('/uploads/{path}', function ($path) {
    $full = public_path("uploads/{$path}");
    if (! File::exists($full)) {
        abort(404);
    }

    return response()->file($full, [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
    ]);
})->where('path', '.*');

Route::options('/backups/{path}', function () {
    return response('', 204, [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers' => '*',
    ]);
})->where('path', '.*');

Route::get('/backups/{path}', function ($path) {
    $full = public_path("backups/{$path}");
    if (! File::exists($full)) {
        abort(404);
    }

    return response()->file($full, [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
    ]);
})->where('path', '.*');
