import { useEffect } from 'react';

interface KeyboardShortcuts {
  onSpace?: () => void;
  onLeftArrow?: () => void;
  onRightArrow?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  onSpace,
  onLeftArrow,
  onRightArrow,
  disabled = false
}: KeyboardShortcuts) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when user is typing in inputs
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      // Don't handle shortcuts when modals are open (check for modal backdrop)
      if (document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50')) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          onSpace?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onLeftArrow?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onRightArrow?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSpace, onLeftArrow, onRightArrow, disabled]);
}