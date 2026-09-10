'use strict';

const form = document.querySelector('#search-form');
const usernameInput = document.querySelector('#username');
const searchButton = document.querySelector('#search-button');
const validationMessage = document.querySelector('#validation-message');
const languageFilter = document.querySelector('#language-filter');
const sortOrder = document.querySelector('#sort-order');
const grid = document.querySelector('#repository-grid');
const statusPanel = document.querySelector('#status');
const repoCount = document.querySelector('#repo-count');
const resultsSummary = document.querySelector('#results-summary');
const profileLink = document.querySelector('#profile-link');
const examples = document.querySelectorAll('[data-username]');
const storageKey = 'github-explorer:last-username';
const usernamePattern = /^[a-z\d]+(?:-[a-z\d]+)*$/i;
const languageColors = { JavaScript: '#b29400', TypeScript: '#3178c6', Python: '#3572a5', Java: '#b07219', HTML: '#e34c26', CSS: '#7656b1', Go: '#008c9e', Rust: '#a04927', C: '#555555', 'C++': '#d04c80', Ruby: '#a31b20', Shell: '#5b8133' };
const numberFormat = new Intl.NumberFormat('en');
let repositories = [];
let currentUsername = '';
let loading = false;

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showStatus(title, message, type = 'empty') {
  statusPanel.hidden = false;
  statusPanel.className = `status-panel ${type}`;
  const icon = makeElement('span', 'state-icon');
  icon.setAttribute('aria-hidden', 'true');
  if (type === 'loading') icon.append(makeElement('span', 'spinner'));
  else icon.textContent = type === 'error' ? '!' : '⌕';
  statusPanel.replaceChildren(icon, makeElement('h3', '', title), makeElement('p', '', message));
}

function setLoading(value) {
  loading = value;
  searchButton.disabled = value;
  searchButton.textContent = value ? 'Searching…' : 'Search repositories ↗';
  usernameInput.readOnly = value;
  examples.forEach(button => { button.disabled = value; });
  languageFilter.disabled = value || repositories.length === 0;
  sortOrder.disabled = value || repositories.length === 0;
  grid.setAttribute('aria-busy', String(value));
}

function validateUsername() {
  const username = usernameInput.value.trim();
  usernameInput.value = username;
  let message = '';
  if (!username) message = 'Please enter a GitHub username.';
  else if (username.length > 39 || !usernamePattern.test(username)) message = 'Use 1–39 letters or numbers, with single hyphens between them.';
  usernameInput.setCustomValidity(message);
  usernameInput.setAttribute('aria-invalid', String(Boolean(message)));
  validationMessage.textContent = message;
  validationMessage.hidden = !message;
  if (message) usernameInput.focus();
  return !message;
}

async function fetchRepositories(username) {
  const collected = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&sort=full_name&direction=asc&per_page=100&page=${page}`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('User not found. Check the username and try again.');
        if (response.status === 403 || response.status === 429) {
          const reset = Number(response.headers.get('x-ratelimit-reset'));
          const resetTime = reset > 0 ? ` Try again after ${new Date(reset * 1000).toLocaleTimeString()}.` : ' Please try again later.';
          throw new Error(`GitHub has temporarily limited requests.${resetTime}`);
        }
        throw new Error(`GitHub could not complete the request (HTTP ${response.status}). Please try again.`);
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.some(repo => !repo || typeof repo.name !== 'string' || typeof repo.html_url !== 'string' || typeof repo.stargazers_count !== 'number')) {
        throw new Error('GitHub returned an unexpected response. Please try again.');
      }
      collected.push(...data);
      const linkHeader = response.headers.get('link');
      hasNextPage = linkHeader ? /rel="next"/.test(linkHeader) : data.length === 100;
      if (hasNextPage) showStatus('Loading repositories…', `${numberFormat.format(collected.length)} repositories loaded. Fetching the next page.`, 'loading');
      page += 1;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The request took too long. Please try again.');
      if (error instanceof TypeError) throw new Error('Unable to reach GitHub. Check your internet connection and try again.');
      if (error instanceof SyntaxError) throw new Error('GitHub returned an unreadable response. Please try again.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  return [...new Map(collected.map(repo => [repo.id, repo])).values()];
}

function populateLanguages() {
  languageFilter.replaceChildren(new Option('All languages', 'all'));
  const languages = [...new Set(repositories.map(repo => repo.language).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  languages.forEach(language => languageFilter.add(new Option(language, language)));
  if (repositories.some(repo => !repo.language)) languageFilter.add(new Option('Not specified', 'none'));
}

function createRepositoryCard(repo) {
  const card = makeElement('article', 'repo-card');
  const top = makeElement('div', 'repo-top');
  const icon = makeElement('span', '', '⌘');
  icon.setAttribute('aria-hidden', 'true');
  top.append(icon, makeElement('span', '', repo.fork ? 'Fork' : 'Public'));
  const heading = makeElement('h3');
  const link = makeElement('a', '', repo.name);
  const url = new URL(repo.html_url);
  link.href = url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : `https://github.com/${encodeURIComponent(currentUsername)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  heading.append(link);
  const description = makeElement('p', '', repo.description || 'No description provided.');
  const meta = makeElement('div', 'repo-meta');
  const language = makeElement('span', 'repo-language');
  const dot = makeElement('span', 'language-dot');
  dot.style.setProperty('--language-color', languageColors[repo.language] || '#80958b');
  dot.setAttribute('aria-hidden', 'true');
  language.append(dot, document.createTextNode(repo.language || 'Not specified'));
  const stars = makeElement('span', '', `☆ ${numberFormat.format(repo.stargazers_count)}`);
  stars.setAttribute('aria-label', `${repo.stargazers_count} stars`);
  meta.append(language, stars);
  card.append(top, heading, description, meta);
  return card;
}

function renderRepositories() {
  const language = languageFilter.value;
  const visible = repositories.filter(repo => language === 'all' || (language === 'none' ? !repo.language : repo.language === language));
  const comparators = {
    'name-asc': (a, b) => a.name.localeCompare(b.name),
    'name-desc': (a, b) => b.name.localeCompare(a.name),
    'stars-desc': (a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name),
    'stars-asc': (a, b) => a.stargazers_count - b.stargazers_count || a.name.localeCompare(b.name)
  };
  visible.sort(comparators[sortOrder.value] || comparators['stars-desc']);
  const fragment = document.createDocumentFragment();
  visible.forEach(repo => fragment.append(createRepositoryCard(repo)));
  grid.replaceChildren(fragment);
  repoCount.textContent = numberFormat.format(repositories.length);
  resultsSummary.textContent = `${numberFormat.format(visible.length)} of ${numberFormat.format(repositories.length)} repositories · @${currentUsername}`;
  statusPanel.hidden = visible.length > 0;
  if (repositories.length === 0) showStatus('No repositories found.', `@${currentUsername} has no public repositories yet.`);
  else if (visible.length === 0) showStatus('No matching repositories.', 'Choose another language to see more projects.');
}

async function searchRepositories(event) {
  event.preventDefault();
  if (loading || !validateUsername()) return;
  currentUsername = usernameInput.value;
  try { localStorage.setItem(storageKey, currentUsername); } catch {}
  repositories = [];
  grid.replaceChildren();
  repoCount.textContent = '0';
  resultsSummary.textContent = `Searching @${currentUsername}…`;
  profileLink.hidden = true;
  populateLanguages();
  setLoading(true);
  showStatus('Loading repositories…', `Looking up public projects from @${currentUsername}.`, 'loading');
  try {
    repositories = await fetchRepositories(currentUsername);
    populateLanguages();
    profileLink.href = `https://github.com/${encodeURIComponent(currentUsername)}`;
    profileLink.hidden = false;
    renderRepositories();
  } catch (error) {
    repositories = [];
    grid.replaceChildren();
    repoCount.textContent = '0';
    profileLink.hidden = true;
    resultsSummary.textContent = 'Search unsuccessful. Please try again.';
    showStatus('We couldn’t load these repositories.', error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
}

form.addEventListener('submit', searchRepositories);
usernameInput.addEventListener('input', () => {
  usernameInput.setCustomValidity('');
  usernameInput.removeAttribute('aria-invalid');
  validationMessage.hidden = true;
});
languageFilter.addEventListener('change', renderRepositories);
sortOrder.addEventListener('change', renderRepositories);
examples.forEach(button => button.addEventListener('click', () => {
  usernameInput.value = button.dataset.username;
  form.requestSubmit();
}));
try {
  const savedUsername = localStorage.getItem(storageKey);
  if (savedUsername && savedUsername.length <= 39 && usernamePattern.test(savedUsername)) usernameInput.value = savedUsername;
} catch {}
