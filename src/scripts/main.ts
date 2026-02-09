import { initSwipe } from './swipe';
import { initModelViewer } from './modelViewer';

document.addEventListener('DOMContentLoaded', () => {
  initSwipe((index) => {
    initModelViewer(index);
  });

  initModelViewer(0);

  const arButton = document.getElementById('ar-button');
  if (arButton) {
    arButton.addEventListener('click', () => {
      alert('AR-Ansicht wird geladen...');
    });
  }
});
