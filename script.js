import { GoogleGenAI } from "@google/genai";

/* --- CONFIGURATION --- */
const LINKS = {
  fullPortfolio: "#",
  socials: {
    github: "https://github.com/rudro-kalix",
    linkedin: "https://linkedin.com/in/rudro-kalix",
    twitter: "https://twitter.com/rudro_kalix",
    facebook: "https://facebook.com/rudro.kalix",
    whatsapp: "https://wa.me/1234567890",
    email: "mailto:rudro@example.com"
  }
};

/* --- DOM UTILS --- */
const $ = s => document.querySelector(s);

/* --- PORTFOLIO LOGIC --- */

function setLinks() {
  const safeSetHref = (id, url) => {
    const el = $(id);
    if (el) el.href = url;
  };
  
  safeSetHref("#portfolioLink", LINKS.fullPortfolio);
  safeSetHref("#githubLink", LINKS.socials.github);
  safeSetHref("#linkedinLink", LINKS.socials.linkedin);
  safeSetHref("#twitterLink", LINKS.socials.twitter);
  safeSetHref("#facebookLink", LINKS.socials.facebook);
  safeSetHref("#whatsappLink", LINKS.socials.whatsapp);
  safeSetHref("#emailLink", LINKS.socials.email);
  safeSetHref("#emailCta", LINKS.socials.email);
}

function yearStamp() {
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
}

function renderProjects(list) {
  const grid = $("#projectsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  
  if (!list || !list.length) {
    grid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center; color: var(--muted);">No projects found matching your criteria.</div>`;
    return;
  }

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    const live = p.live || '#';
    
    // Formatting helper
    const updated = p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '';
    
    card.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <p class="project-desc">${escapeHtml(p.description || "No description provided.")}</p>
      <div class="project-meta">
        ${p.language ? `<span class="badge badge--lang">${escapeHtml(p.language)}</span>` : ''}
        ${p.stars > 0 ? `<span class="badge">★ ${p.stars}</span>` : ''}
        ${updated ? `<span>Last updated: ${updated}</span>` : ''}
      </div>
      <a class="btn btn--ghost" style="font-size:0.8rem; padding: 0.4rem 0.8rem;" href="${live}" target="_blank" rel="noopener">View Project</a>
    `;
    grid.appendChild(card);
  });
}

// GitHub Fetcher
let allProjects = [];

async function loadGitHubRepos(username = 'rudro-kalix') {
  try {
    const resp = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`);
    if (!resp.ok) throw new Error('GitHub API error');
    const repos = await resp.json();
    
    allProjects = repos
      .filter(r => !r.fork)
      .map(r => ({
        title: r.name,
        live: r.homepage || r.html_url,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        updated_at: r.updated_at
      }));

    renderProjects(allProjects);
  } catch (e) {
    console.warn('Failed to load GitHub repos:', e);
    // Fallback static data if fetch fails
    allProjects = [
      { title: "Portfolio Website", description: "Personal portfolio built with HTML/CSS/JS.", language: "JavaScript", stars: 5, live: "#" },
      { title: "AI Chat Assistant", description: "Gemini powered chatbot integration.", language: "TypeScript", stars: 3, live: "#" }
    ];
    renderProjects(allProjects);
  }
}

function attachSearch() {
  const input = $("#searchInput");
  if (!input) return;
  input.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allProjects.filter(p => 
      (p.title && p.title.toLowerCase().includes(q)) || 
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.language && p.language.toLowerCase().includes(q))
    );
    renderProjects(filtered);
  });
}

// Theme Toggle
function initTheme() {
  const saved = localStorage.getItem('theme');
  const toggleBtn = $("#themeToggle");
  const icon = toggleBtn.querySelector('.theme-icon');
  
  const applyTheme = (theme) => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      icon.textContent = '☀️';
    } else {
      document.documentElement.classList.remove('theme-light');
      icon.textContent = '🌙';
    }
  };

  applyTheme(saved);

  toggleBtn.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('theme-light');
    const newTheme = isLight ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    icon.textContent = isLight ? '☀️' : '🌙';
  });
}

function attachContactForm() {
  const form = $("#contactForm");
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $("#cfName").value;
    const body = $("#cfMessage").value;
    const email = $("#cfEmail").value;
    window.location.href = `mailto:rudro@example.com?subject=Contact from ${name}&body=${body}%0A%0AFrom: ${email}`;
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

/* --- CHATBOT LOGIC --- */
let chatHistory = null;
let aiClient = null;

function initChatbot() {
  // Initialize AI
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    console.error("AI Client Init Error:", e);
    addBotMessage("System: API Key missing or invalid. Chat disabled.");
    $("#chatInput").disabled = true;
    $("#sendChat").disabled = true;
    return;
  }

  // DOM Elements
  const toggleBtn = $("#toggleChat");
  const closeBtn = $("#closeChat");
  const chatWindow = $("#chatWindow");
  const sendBtn = $("#sendChat");
  const input = $("#chatInput");

  // Toggle
  const toggleChat = () => chatWindow.classList.toggle("hidden");
  toggleBtn.addEventListener("click", toggleChat);
  closeBtn.addEventListener("click", toggleChat);

  // Send
  const handleSend = async () => {
    const text = input.value.trim();
    if (!text) return;

    addUserMessage(text);
    input.value = "";
    input.disabled = true;
    sendBtn.disabled = true;

    // Loading indicator
    const loadingId = addBotMessage("Thinking...");

    try {
      if (!chatHistory) {
         chatHistory = aiClient.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: "You are a friendly and professional AI assistant for Rudro Kalix's developer portfolio. You answer questions about his projects, skills (React, Node, Python, AI), and experience. Keep answers concise and engaging. Use emojis sparingly."
            }
         });
      }

      const result = await chatHistory.sendMessage({ message: text });
      const responseText = result.text;
      
      // Remove loading, add real response
      removeMessage(loadingId);
      addBotMessage(responseText);

    } catch (err) {
      console.error(err);
      removeMessage(loadingId);
      addBotMessage("Sorry, I encountered an error connecting to the AI.");
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  };

  sendBtn.addEventListener("click", handleSend);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSend();
  });
}

function addUserMessage(text) {
  const container = $("#chatMessages");
  const div = document.createElement("div");
  div.className = "message user";
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addBotMessage(text) {
  const container = $("#chatMessages");
  const div = document.createElement("div");
  div.className = "message bot";
  div.id = "msg-" + Date.now();
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div.id;
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/* --- INITIALIZATION --- */
window.addEventListener("DOMContentLoaded", () => {
  setLinks();
  yearStamp();
  initTheme();
  loadGitHubRepos(); // Loads projects
  attachSearch();
  attachContactForm();
  
  // Init Chatbot
  initChatbot();
});
