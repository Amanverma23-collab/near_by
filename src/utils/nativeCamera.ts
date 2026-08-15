import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Capture photo using Capacitor Camera plugin ONLY when running on native device (Android/iOS).
 * On desktop/web browsers, returns null so in-browser live WebRTC webcam opens directly without file dialog.
 */
export async function capturePhoto(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera, // forces camera only, no gallery
    });

    return photo.webPath || photo.path || null;
  } catch (err) {
    console.warn('Capacitor Camera error/cancelled:', err);
    return null;
  }
}

