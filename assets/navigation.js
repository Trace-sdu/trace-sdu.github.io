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

  const years = topicLinks.filter(link => link.closest('.year-nav')).map(link => ({
    link,
    section: document.getElementById(link.hash.slice(1)),
  })).filter(year => year.section);

  if (years.length > 1) {
    let updatePending = false;

    function updateYear() {
      updatePending = false;

      const firstYear = years[0];
      const page = document.scrollingElement;
      // The last section can be too short to reach the top of the viewport.
      if (page.scrollTop + page.clientHeight >= page.scrollHeight - 1) {
        selectTopic(years.at(-1).link);
        return;
      }

      const readingLine = parseFloat(getComputedStyle(firstYear.section).scrollMarginTop) + 1;
      let currentYear = firstYear;
      for (const year of years) {
        if (year.section.getBoundingClientRect().top > readingLine) break;
        currentYear = year;
      }
      selectTopic(currentYear.link);
    }

    function scheduleYearUpdate() {
      if (updatePending) return;
      updatePending = true;
      requestAnimationFrame(updateYear);
    }

    window.addEventListener('scroll', scheduleYearUpdate, { passive: true });
    window.addEventListener('resize', scheduleYearUpdate);
    window.addEventListener('pageshow', scheduleYearUpdate);
  }
}
