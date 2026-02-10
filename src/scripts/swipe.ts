export function initSwipe(onSlideChange: (index: number) => void) {
  const swipeContainer = document.getElementById('swipe-container');
  const slidesWrapper = document.getElementById('slides-wrapper');
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const appContainer = document.querySelector('.app-container');

  if (!swipeContainer || !slidesWrapper) return;

  let currentIndex = 0;
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  function isInsideModelViewer(target: EventTarget | null): boolean {
    if (!target || !(target instanceof Element)) return false;
    return target.closest('.model-viewer') !== null;
  }

  function isTextSelected(): boolean {
    const selection = window.getSelection();
    return selection !== null && selection.toString().length > 0;
  }

  function setSliding(isSliding: boolean) {
    if (appContainer) {
      if (isSliding) {
        appContainer.classList.add('sliding');
      } else {
        appContainer.classList.remove('sliding');
      }
    }
  }

  function updateSlide(index: number) {
    currentIndex = Math.max(0, Math.min(index, slides.length - 1));

    setSliding(true);
    slidesWrapper!.style.transform = `translateX(-${currentIndex * 100}%)`;

    setTimeout(() => {
      setSliding(false);
    }, 350);

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });

    onSlideChange(currentIndex);
  }

  swipeContainer.addEventListener('touchstart', (e) => {
    if (isInsideModelViewer(e.target)) return;
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
    slidesWrapper.style.transition = 'none';
  }, { passive: true });

  swipeContainer.addEventListener('touchmove', (e) => {
    if (!isDragging || isInsideModelViewer(e.target)) return;
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    const offset = -currentIndex * 100 + (diff / swipeContainer.offsetWidth) * 100;
    slidesWrapper.style.transform = `translateX(${offset}%)`;
  }, { passive: true });

  swipeContainer.addEventListener('touchend', () => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    slidesWrapper.style.transition = 'transform 0.3s ease-out';

    const diff = currentX - startX;
    const threshold = swipeContainer.offsetWidth * 0.2;

    if (diff > threshold && currentIndex > 0) {
      updateSlide(currentIndex - 1);
    } else if (diff < -threshold && currentIndex < slides.length - 1) {
      updateSlide(currentIndex + 1);
    } else {
      updateSlide(currentIndex);
    }
  });

  swipeContainer.addEventListener('mousedown', (e) => {
    if (isInsideModelViewer(e.target)) return;
    startX = e.clientX;
    currentX = startX;
    isDragging = true;
    setSliding(true);
    slidesWrapper.style.transition = 'none';
  });

  swipeContainer.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    if (isTextSelected()) {
      isDragging = false;
      slidesWrapper.style.transition = 'transform 0.3s ease-out';
      updateSlide(currentIndex);
      return;
    }
    currentX = e.clientX;
    const diff = currentX - startX;
    const offset = -currentIndex * 100 + (diff / swipeContainer.offsetWidth) * 100;
    slidesWrapper.style.transform = `translateX(${offset}%)`;
  });

  swipeContainer.addEventListener('mouseup', () => {
    if (!isDragging || isTextSelected()) {
      isDragging = false;
      return;
    }
    isDragging = false;
    slidesWrapper.style.transition = 'transform 0.3s ease-out';

    const diff = currentX - startX;
    const threshold = swipeContainer.offsetWidth * 0.2;

    if (diff > threshold && currentIndex > 0) {
      updateSlide(currentIndex - 1);
    } else if (diff < -threshold && currentIndex < slides.length - 1) {
      updateSlide(currentIndex + 1);
    } else {
      updateSlide(currentIndex);
    }
  });

  swipeContainer.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      slidesWrapper.style.transition = 'transform 0.3s ease-out';
      updateSlide(currentIndex);
    }
  });

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      updateSlide(index);
    });
  });

  updateSlide(0);

  return { updateSlide };
}
