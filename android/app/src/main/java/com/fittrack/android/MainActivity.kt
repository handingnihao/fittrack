package com.fittrack.android

import android.Manifest
import android.app.AlertDialog
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.Menu
import android.view.MenuItem
import android.webkit.*
import android.widget.EditText
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var prefs: SharedPreferences
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null

    private val fileChooserLauncher: ActivityResultLauncher<Intent> =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris: Array<Uri>? = when {
                result.resultCode != RESULT_OK -> null
                result.data?.data != null -> arrayOf(result.data!!.data!!)
                cameraImageUri != null -> arrayOf(cameraImageUri!!)
                else -> null
            }
            filePathCallback?.onReceiveValue(uris)
            filePathCallback = null
            cameraImageUri = null
        }

    private val cameraPermissionLauncher: ActivityResultLauncher<String> =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            // Permission result handled; user can retry the upload action
        }

    private val storagePermissionLauncher: ActivityResultLauncher<String> =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        prefs = getSharedPreferences("fittrack_prefs", MODE_PRIVATE)

        val container = FrameLayout(this)
        setContentView(container)

        webView = WebView(this)
        container.addView(webView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        setupWebView()
        setupBackNavigation()

        val savedUrl = prefs.getString("server_url", null)
        if (savedUrl == null) {
            showUrlDialog(isFirstLaunch = true)
        } else {
            webView.loadUrl(savedUrl)
        }
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportMultipleWindows(false)
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    showErrorPage(error.description.toString())
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                openFileChooser()
                return true
            }
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    private fun openFileChooser() {
        // Request permissions if needed
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES)
                != PackageManager.PERMISSION_GRANTED) {
                storagePermissionLauncher.launch(Manifest.permission.READ_MEDIA_IMAGES)
            }
        } else if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED) {
                storagePermissionLauncher.launch(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }

        // Create camera capture intent
        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        cameraImageUri = createImageUri()
        cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)

        // Gallery intent
        val galleryIntent = Intent(Intent.ACTION_GET_CONTENT)
        galleryIntent.type = "image/*"

        // Chooser combining both
        val chooser = Intent.createChooser(galleryIntent, "Select Image")
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))

        fileChooserLauncher.launch(chooser)
    }

    private fun createImageUri(): Uri? {
        return try {
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val imageFile = File(externalCacheDir, "JPEG_${timeStamp}_.jpg")
            FileProvider.getUriForFile(this, "com.fittrack.android.fileprovider", imageFile)
        } catch (e: Exception) {
            null
        }
    }

    private fun showErrorPage(errorDescription: String) {
        val serverUrl = prefs.getString("server_url", "http://umbrel.local:3080") ?: ""
        val html = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        background: #0f172a;
                        color: #e2e8f0;
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        padding: 24px;
                    }
                    .card {
                        background: #1e293b;
                        border-radius: 16px;
                        padding: 32px 24px;
                        text-align: center;
                        max-width: 360px;
                        width: 100%;
                    }
                    .icon { font-size: 48px; margin-bottom: 16px; }
                    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #f1f5f9; }
                    p { font-size: 14px; color: #94a3b8; margin-bottom: 8px; }
                    .url { font-size: 13px; color: #60a5fa; word-break: break-all; margin-bottom: 24px; }
                    button {
                        background: #3b82f6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        width: 100%;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">⚡</div>
                    <h1>Can't reach FitTrack</h1>
                    <p>Make sure your phone is on the same WiFi as Umbrel.</p>
                    <p class="url">$serverUrl</p>
                    <button onclick="window.location.reload()">Retry</button>
                </div>
            </body>
            </html>
        """.trimIndent()
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
    }

    private fun showUrlDialog(isFirstLaunch: Boolean) {
        val currentUrl = prefs.getString("server_url", "http://umbrel.local:3080") ?: "http://umbrel.local:3080"
        val input = EditText(this)
        input.setText(currentUrl)
        input.setSelection(input.text.length)

        val title = if (isFirstLaunch) "FitTrack Server URL" else "Change Server URL"
        val message = if (isFirstLaunch)
            "Enter your Umbrel server address.\nDefault: http://umbrel.local:3080\nOr use your Umbrel IP, e.g. http://192.168.1.100:3080"
        else
            "Enter the FitTrack server address:"

        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setView(input)
            .setCancelable(!isFirstLaunch)
            .setPositiveButton("Connect") { _, _ ->
                var url = input.text.toString().trim()
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = "http://$url"
                }
                prefs.edit().putString("server_url", url).apply()
                webView.loadUrl(url)
            }
            .show()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menu.add(Menu.NONE, MENU_CHANGE_URL, Menu.NONE, "Change Server URL")
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            MENU_CHANGE_URL -> {
                showUrlDialog(isFirstLaunch = false)
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    companion object {
        private const val MENU_CHANGE_URL = 1
    }
}
