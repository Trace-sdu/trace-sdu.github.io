const tablist = document.querySelector('.people-tabs');
const tabs = [...tablist.querySelectorAll('[role="tab"]')];

function selectTab(selectedTab) {
  for (const tab of tabs) {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
}

tablist.addEventListener('keydown', event => {
  const currentIndex = tabs.indexOf(event.target);
  const lastIndex = tabs.length - 1;
  const destinations = {
    ArrowLeft: (currentIndex + lastIndex) % tabs.length,
    ArrowRight: (currentIndex + 1) % tabs.length,
    Home: 0,
    End: lastIndex,
  };
  if (currentIndex < 0 || !Object.hasOwn(destinations, event.key)) return;

  event.preventDefault();
  const nextTab = tabs[destinations[event.key]];
  selectTab(nextTab);
  nextTab.focus();
});
