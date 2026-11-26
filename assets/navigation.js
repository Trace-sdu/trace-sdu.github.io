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
  let selectedTopic;

  function selectTopic(current) {
    if (current === selectedTopic) return;

    for (const link of topicLinks) {
      if (link === current) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    }

    selectedTopic = current;
  }

  function selectHashTopic() {
    selectTopic(topicLinks.find(link => link.hash === location.hash) ?? topicLinks[0]);
  }

  window.addEventListener('hashchange', selectHashTopic);
  selectHashTopic();

  const topics = topicLinks.map(link => ({
    link,
    section: document.getElementById(link.hash.slice(1)),
  })).filter(topic => topic.section);

  if (topics.length > 1) {
    let updatePending = false;

    function updateTopicFromScroll() {
      updatePending = false;

      const firstTopic = topics[0];
      const page = document.scrollingElement;
      // The last section can be too short to reach the top of the viewport.
      if (page.scrollTop > 0 && page.scrollTop + page.clientHeight >= page.scrollHeight - 1) {
        selectTopic(topics.at(-1).link);
        return;
      }

      const readingLine = parseFloat(getComputedStyle(firstTopic.section).scrollMarginTop) + 1;
      let currentTopic = firstTopic;
      for (const topic of topics) {
        if (topic.section.getBoundingClientRect().top > readingLine) break;
        currentTopic = topic;
      }
      selectTopic(currentTopic.link);
    }

    function scheduleTopicUpdate() {
      if (updatePending) return;
      updatePending = true;
      requestAnimationFrame(updateTopicFromScroll);
    }

    window.addEventListener('scroll', scheduleTopicUpdate, { passive: true });
    window.addEventListener('resize', scheduleTopicUpdate);
    window.addEventListener('pageshow', scheduleTopicUpdate);
  }
}
