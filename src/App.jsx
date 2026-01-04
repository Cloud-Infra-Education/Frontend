import React from "react";

export default function App() {
  return (
    <div className="app">
      <section className="hero-section">
        <header className="hero-header">
          <div className="logo">
            <div className="logo-symbol" aria-hidden="true" />
            K-DEFENSE TECH
          </div>

          <nav className="hero-nav" aria-label="Primary">
            <a href="#who">Who We Are</a>
            <a href="#why">Why We Exist</a>
            <a href="#what">What We Do</a>
            <a href="#media">Media</a>
            <a href="#careers">Careers</a>
          </nav>

          <div className="header-right">
            <span className="lang">KR/EN</span>
            <button className="menu-btn" type="button" aria-label="Open menu">
              ☰
            </button>
          </div>
        </header>

        <div className="bottom-content">
          <h1 className="main-slogan">
            The innovating pioneer for
            <br />
            a sustainable tomorrow
          </h1>
          <div className="bottom-bar" aria-hidden="true" />
        </div>


	 	  	  	  
        <a className="scroll-down" href="#who" aria-label="Scroll down">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
        </a>
      </section>
    </div>
  );
}

