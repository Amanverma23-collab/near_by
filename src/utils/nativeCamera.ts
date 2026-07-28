import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Capture photo using Capacitor Camera plugin
 */
export async function capturePhoto(): Promise<string | null> {
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
