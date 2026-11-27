// Before / after slider: the range input inside each .ba sets --p,
// which clips the "after" layer and moves the handle.

document.addEventListener('input', (event) => {
  const input = event.target;
  if (!input.classList || !input.classList.contains('ba-r')) return;
  const box = input.closest('.ba');
  if (box) box.style.setProperty('--p', `${input.value}%`);
});
