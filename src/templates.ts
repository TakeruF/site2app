// =============================================================================
// Template generators for Android Media Session support
// =============================================================================

/**
 * MainActivity.kt — Capacitor BridgeActivity with WebView media session bridge
 */
export function generateMainActivityKt(packageId: string, targetUrl: string, inAppDomains: string[]): string {
  // Extract host from targetUrl
  const targetHost = (() => {
    try { return new URL(targetUrl).hostname; } catch { return ""; }
  })();

  // Build the allowed domains list (target domain is always included)
  const allDomains = [targetHost, ...inAppDomains].filter(Boolean);
  const domainsKotlinList = allDomains.map((d) => `"${d}"`).join(", ");

  return `package ${packageId}

import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Intent
import android.content.ServiceConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    /** Domains that should be opened inside the app (WebView). */
    private val inAppDomains = listOf(${domainsKotlinList})

    private lateinit var mediaSession: MediaSessionCompat
    private var playbackService: MediaPlaybackService? = null
    private var serviceBound = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val localBinder = binder as MediaPlaybackService.LocalBinder
            playbackService = localBinder.getService()
            playbackService?.attachMediaSession(mediaSession)
            serviceBound = true
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            playbackService = null
            serviceBound = false
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setupMediaSession()
        startAndBindService()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onResume() {
        super.onResume()
        // Capacitor's WebView is available after the bridge loads
        bridge?.webView?.let { webView ->
            configureWebView(webView)
        }
    }

    private fun configureWebView(webView: WebView) {
        webView.settings.apply {
            javaScriptEnabled = true
            mediaPlaybackRequiresUserGesture = false
            domStorageEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // Set up link routing: in-app domains stay in WebView, others open externally
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url ?: return false
                val scheme = url.scheme ?: return false

                // Delegate special schemes (mailto, tel, intent, etc.) to the OS
                if (scheme != "http" && scheme != "https") {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, url))
                    } catch (_: Exception) { }
                    return true
                }

                val host = url.host ?: return false

                // Check if this domain should be opened in-app
                for (domain in inAppDomains) {
                    if (host == domain || host.endsWith(".\$domain")) {
                        return false // Keep in WebView
                    }
                }

                // External domain — open in the default browser
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                } catch (_: Exception) { }
                return true
            }
        }

        // Add native bridge (only once)
        try {
            webView.addJavascriptInterface(MediaBridge(), "NativeMediaBridge")
        } catch (_: Exception) {
            // Interface may already be added
        }

        // Inject the media observer script
        webView.evaluateJavascript(MEDIA_OBSERVER_JS, null)
    }

    // -------------------------------------------------------------------------
    // Media Session
    // -------------------------------------------------------------------------

    private fun setupMediaSession() {
        val session = MediaSessionCompat(this, "WebViewMediaSession")
        session.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        )
        session.setCallback(object : MediaSessionCompat.Callback() {
            override fun onPlay() {
                executeJs("window.__mediaBridge?.play()")
            }

            override fun onPause() {
                executeJs("window.__mediaBridge?.pause()")
            }

            override fun onSkipToNext() {
                executeJs("window.__mediaBridge?.skipNext()")
            }

            override fun onSkipToPrevious() {
                executeJs("window.__mediaBridge?.skipPrev()")
            }

            override fun onSeekTo(pos: Long) {
                executeJs("window.__mediaBridge?.seekTo(\${pos / 1000.0})")
            }

            override fun onStop() {
                executeJs("window.__mediaBridge?.pause()")
                session.setActive(false)
                stopPlaybackService()
            }
        })
        session.setActive(true)
        mediaSession = session
    }

    private fun startAndBindService() {
        val intent = Intent(this, MediaPlaybackService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        bindService(intent, serviceConnection, BIND_AUTO_CREATE)
    }

    private fun stopPlaybackService() {
        if (serviceBound) {
            unbindService(serviceConnection)
            serviceBound = false
        }
        stopService(Intent(this, MediaPlaybackService::class.java))
    }

    private fun executeJs(script: String) {
        runOnUiThread {
            bridge?.webView?.evaluateJavascript(script, null)
        }
    }

    // -------------------------------------------------------------------------
    // JavaScript Interface — called from Web side
    // -------------------------------------------------------------------------

    inner class MediaBridge {
        @JavascriptInterface
        fun onPlaybackStateChanged(state: String, positionSec: Double, speedRate: Float) {
            val pbState = when (state) {
                "playing" -> PlaybackStateCompat.STATE_PLAYING
                "paused"  -> PlaybackStateCompat.STATE_PAUSED
                "ended"   -> PlaybackStateCompat.STATE_STOPPED
                else      -> PlaybackStateCompat.STATE_NONE
            }
            val posMs = (positionSec * 1000).toLong()
            val stateBuilder = PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackStateCompat.ACTION_SEEK_TO or
                    PlaybackStateCompat.ACTION_STOP
                )
                .setState(pbState, posMs, speedRate)

            mediaSession.setPlaybackState(stateBuilder.build())

            if (pbState == PlaybackStateCompat.STATE_PLAYING) {
                mediaSession.setActive(true)
                playbackService?.updateNotification()
            }
        }

        @JavascriptInterface
        fun onMetadataChanged(title: String, artist: String, artworkUrl: String, durationSec: Double) {
            val metadata = MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadataCompat.METADATA_KEY_ART_URI, artworkUrl)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, (durationSec * 1000).toLong())
                .build()

            mediaSession.setMetadata(metadata)
            playbackService?.updateNotification()
        }
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    override fun onDestroy() {
        mediaSession.release()
        stopPlaybackService()
        super.onDestroy()
    }

    companion object {
        /**
         * JavaScript injected into the WebView to observe media elements
         * and bridge playback events to the native layer.
         */
        private val MEDIA_OBSERVER_JS = """
            (function() {
              if (window.__mediaBridge) return; // already injected

              window.__mediaBridge = {
                _video: null,

                // Called from native for transport controls
                play:     function() { this._video?.play(); },
                pause:    function() { this._video?.pause(); },
                skipNext: function() {
                  document.querySelector('[class*="skip-next"], [class*="next"], [aria-label*="Next"]')?.click();
                },
                skipPrev: function() {
                  document.querySelector('[class*="skip-prev"], [class*="previous"], [aria-label*="Previous"]')?.click();
                },
                seekTo:   function(sec) { if (this._video) this._video.currentTime = sec; },

                // Report state to native
                _reportState: function(video) {
                  if (!video) return;
                  var state = video.paused ? (video.ended ? 'ended' : 'paused') : 'playing';
                  try {
                    NativeMediaBridge.onPlaybackStateChanged(
                      state, video.currentTime, video.playbackRate
                    );
                  } catch(e) {}
                },

                _reportMetadata: function(video) {
                  var title   = '';
                  var artist  = '';
                  var artwork = '';

                  // Try Web Media Session API first
                  if (navigator.mediaSession && navigator.mediaSession.metadata) {
                    var m = navigator.mediaSession.metadata;
                    title   = m.title   || '';
                    artist  = m.artist  || '';
                    if (m.artwork && m.artwork.length > 0) {
                      artwork = m.artwork[m.artwork.length - 1].src || '';
                    }
                  }

                  // Fallback to page info
                  if (!title) title = document.title || '';
                  if (!artwork) {
                    var og = document.querySelector('meta[property="og:image"]');
                    if (og) artwork = og.content || '';
                  }

                  var dur = (video && isFinite(video.duration)) ? video.duration : 0;
                  try {
                    NativeMediaBridge.onMetadataChanged(title, artist, artwork, dur);
                  } catch(e) {}
                },

                // Attach listeners to a video element
                _observe: function(video) {
                  if (video.__mediaBridgeAttached) return;
                  video.__mediaBridgeAttached = true;
                  var self = this;
                  self._video = video;

                  ['play','pause','ended','seeked'].forEach(function(evt) {
                    video.addEventListener(evt, function() {
                      self._reportState(video);
                    });
                  });

                  video.addEventListener('loadedmetadata', function() {
                    self._reportMetadata(video);
                  });

                  video.addEventListener('playing', function() {
                    self._reportMetadata(video);
                    self._reportState(video);
                  });

                  // Periodic position update while playing
                  setInterval(function() {
                    if (video && !video.paused) {
                      self._reportState(video);
                    }
                  }, 5000);
                }
              };

              // Observe DOM for video elements
              function scanVideos() {
                document.querySelectorAll('video').forEach(function(v) {
                  window.__mediaBridge._observe(v);
                });
              }

              scanVideos();

              var observer = new MutationObserver(function() { scanVideos(); });
              observer.observe(document.body || document.documentElement, {
                childList: true, subtree: true
              });

              // Also intercept Media Session API updates from the web page
              if (navigator.mediaSession) {
                var origSet = Object.getOwnPropertyDescriptor(
                  MediaMetadata.prototype, 'title'
                );
                // Poll metadata changes since property descriptors may not be settable
                setInterval(function() {
                  if (window.__mediaBridge._video) {
                    window.__mediaBridge._reportMetadata(window.__mediaBridge._video);
                  }
                }, 3000);
              }
            })();
        """.trimIndent()
    }
}
`;
}

/**
 * MediaPlaybackService.kt — Foreground service for background media playback
 */
export function generateMediaPlaybackServiceKt(packageId: string): string {
  return `package ${packageId}

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import java.net.URL
import kotlinx.coroutines.*

class MediaPlaybackService : Service() {

    private val binder = LocalBinder()
    private var mediaSession: MediaSessionCompat? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    inner class LocalBinder : Binder() {
        fun getService(): MediaPlaybackService = this@MediaPlaybackService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        // Start with a minimal notification immediately to satisfy foreground requirement
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    fun attachMediaSession(session: MediaSessionCompat) {
        mediaSession = session
        updateNotification()
    }

    fun updateNotification() {
        val notification = buildNotification()
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun buildNotification(): Notification {
        val session = mediaSession
        val metadata = session?.controller?.metadata
        val playbackState = session?.controller?.playbackState

        val title = metadata?.getString(
            android.support.v4.media.MediaMetadataCompat.METADATA_KEY_TITLE
        ) ?: getString(applicationInfo.labelRes)

        val artist = metadata?.getString(
            android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ARTIST
        ) ?: ""

        val isPlaying = playbackState?.state == PlaybackStateCompat.STATE_PLAYING

        // Launch activity on tap
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val contentIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(artist)
            .setSmallIcon(applicationInfo.icon)
            .setContentIntent(contentIntent)
            .setOngoing(isPlaying)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setStyle(
                MediaStyle()
                    .setMediaSession(session?.sessionToken)
                    .setShowActionsInCompactView(0, 1, 2)
            )

        // Transport actions
        builder.addAction(
            android.R.drawable.ic_media_previous, "Previous",
            buildMediaAction(PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
        )
        if (isPlaying) {
            builder.addAction(
                android.R.drawable.ic_media_pause, "Pause",
                buildMediaAction(PlaybackStateCompat.ACTION_PAUSE)
            )
        } else {
            builder.addAction(
                android.R.drawable.ic_media_play, "Play",
                buildMediaAction(PlaybackStateCompat.ACTION_PLAY)
            )
        }
        builder.addAction(
            android.R.drawable.ic_media_next, "Next",
            buildMediaAction(PlaybackStateCompat.ACTION_SKIP_TO_NEXT)
        )

        // Load artwork asynchronously
        val artUri = metadata?.getString(
            android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ART_URI
        )
        if (!artUri.isNullOrBlank()) {
            scope.launch {
                val bitmap = loadBitmap(artUri)
                if (bitmap != null) {
                    val updated = builder.setLargeIcon(bitmap).build()
                    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                    manager.notify(NOTIFICATION_ID, updated)
                }
            }
        }

        return builder.build()
    }

    private fun buildMediaAction(action: Long): PendingIntent {
        val intent = Intent(Intent.ACTION_MEDIA_BUTTON).apply {
            setPackage(packageName)
        }
        return PendingIntent.getBroadcast(
            this, action.toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun loadBitmap(url: String): Bitmap? {
        return try {
            val stream = URL(url).openStream()
            BitmapFactory.decodeStream(stream)
        } catch (e: Exception) {
            null
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Media Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Media playback controls"
                setShowBadge(false)
            }
            val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val CHANNEL_ID = "media_playback"
        const val NOTIFICATION_ID = 1001
    }
}
`;
}

/**
 * Additions needed for AndroidManifest.xml
 */
export function generateManifestPatch(): string {
  return `
    <!-- Media playback permissions -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
`;
}

/**
 * Service declaration to insert inside <application> in AndroidManifest.xml
 */
export function generateManifestServiceDecl(): string {
  return `
        <service
            android:name=".MediaPlaybackService"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback" />
`;
}

/**
 * build.gradle additions — Kotlin plugin + media dependencies
 */
export function generateGradlePatch(): string {
  return `
// --- Media Session support (added by site2app) ---
apply plugin: 'kotlin-android'

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib:1.9.22"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
    implementation "androidx.media:media:1.7.0"
}
`;
}

/**
 * project-level build.gradle Kotlin classpath addition
 */
export function generateProjectGradlePatch(): string {
  return `        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22"`;
}

/**
 * Sample HTML page demonstrating the media bridge
 */
export function generateMediaSampleHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Media Session Demo</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
    video { width: 100%; border-radius: 8px; }
    .controls { display: flex; gap: 8px; margin-top: 1rem; }
    button { padding: 8px 16px; border-radius: 4px; border: 1px solid #ccc; background: #f5f5f5; }
  </style>
</head>
<body>
  <h2>Media Session Demo</h2>
  <video id="player" controls playsinline>
    <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
  </video>
  <div class="controls">
    <button onclick="player.play()">Play</button>
    <button onclick="player.pause()">Pause</button>
  </div>

  <script>
    // Set Web Media Session metadata — the native bridge reads this
    const player = document.getElementById('player');
    player.addEventListener('playing', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title:   'Big Buck Bunny',
          artist:  'Blender Foundation',
          artwork: [
            { src: 'https://peach.blender.org/wp-content/uploads/bbb-splash.png', sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.setActionHandler('play',          () => player.play());
        navigator.mediaSession.setActionHandler('pause',         () => player.pause());
        navigator.mediaSession.setActionHandler('seekto',        (d) => { player.currentTime = d.seekTime; });
        navigator.mediaSession.setActionHandler('previoustrack', () => { player.currentTime = 0; });
        navigator.mediaSession.setActionHandler('nexttrack',     () => { player.currentTime = player.duration; });
      }
    });
  </script>
</body>
</html>
`;
}
