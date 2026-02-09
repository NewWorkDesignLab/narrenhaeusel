import { initSwipe } from './swipe';
import { initModelViewer, resetViewerView } from './modelViewer';

document.addEventListener('DOMContentLoaded', () => {
  let previousIndex = 0;

  initSwipe((index) => {
    if (previousIndex !== index) {
      resetViewerView(previousIndex);
    }
    initModelViewer(index);
    previousIndex = index;
  });

  initModelViewer(0);

  const arButton = document.getElementById('ar-button');
  if (arButton) {
    arButton.addEventListener('click', () => {
      alert('Zukünftige Weiterleitung zum App- / Play Store für die AR-App');
    });
  }
});
