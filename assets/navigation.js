const peopleMenu = document.querySelector('.people-menu');
const peopleSummary = peopleMenu.querySelector('summary');

peopleMenu.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') peopleMenu.open = true;
});

peopleMenu.addEventListener('pointerleave', event => {
  if (event.pointerType === 'mouse' && !peopleMenu.contains(document.activeElement)) {
    peopleMenu.open = false;
  }
});

peopleMenu.addEventListener('focusout', event => {
  if (!peopleMenu.contains(event.relatedTarget) && !peopleMenu.matches(':hover')) {
    peopleMenu.open = false;
  }
});

document.addEventListener('pointerdown', event => {
  if (!peopleMenu.contains(event.target)) peopleMenu.open = false;
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !peopleMenu.open) return;

  if (peopleMenu.contains(document.activeElement)) peopleSummary.focus();
  peopleMenu.open = false;
  event.preventDefault();
});

const topicLinks = [...document.querySelectorAll('.topic-nav a[href^="#"]')];

if (topicLinks.length > 0) {
  function selectTopic() {
    const current = topicLinks.find(link => link.hash === location.hash) ?? topicLinks[0];
    for (const link of topicLinks) {
      if (link === current) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  window.addEventListener('hashchange', selectTopic);
  selectTopic();
}
