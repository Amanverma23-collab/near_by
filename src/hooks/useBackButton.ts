import { useEffect } from 'react';

/**
 * Custom hook to allow modals, drawers, overlays, or step wizards to handle the Android hardware back button.
 * When enabled (e.g. when modal is open), pressing the hardware back button will trigger `onBack`
 * and prevent default route navigation or app exiting.
 */
export function useBackButton(onBack: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleHardwareBack = (e: Event) => {
      e.preventDefault();
      onBack();
    };

    window.addEventListener('hardwareBackButton', handleHardwareBack);
    return () => {
      window.removeEventListener('hardwareBackButton', handleHardwareBack);
    };
  }, [onBack, enabled]);
}
