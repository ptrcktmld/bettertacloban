(function () {
  'use strict';

  const DATA = '/data/';

  function loadJson(path) {
    return fetch(DATA + path, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) throw new Error('Verified data is unavailable.');
      return response.json();
    });
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return value || '';
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
  }

  function sourceById(sources, id) {
    return (sources.sources || []).find(function (source) { return source.id === id; });
  }

  function officialLink(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return null;
      const link = element('a', 'bb-provenance-link', 'Official source →');
      link.href = parsed.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return link;
    } catch (_) {
      return null;
    }
  }

  function namedOfficialLink(url, label) {
    const link = officialLink(url);
    if (link) link.textContent = label;
    return link;
  }

  function provenance(options) {
    const wrap = element('div', 'bb-provenance');
    const source = sourceById(options.sources, options.sourceId);
    const text = element('p');
    text.append('Source: ' + (source ? source.publisher : 'Official government source'));
    if (options.referenceDate) text.append(' · Reference date: ' + formatDate(options.referenceDate));
    if (options.lastVerified) text.append(' · Last verified: ' + formatDate(options.lastVerified));
    wrap.append(text);
    const link = officialLink(options.url || (source && source.url));
    if (link) wrap.append(link);
    return wrap;
  }

  function failure(target) {
    target.replaceChildren(element('div', 'bb-callout bb-data-message', 'Verified local data is temporarily unavailable. Please use official government sources for time-sensitive information.'));
  }

  function metric(label, value, detail) {
    const card = element('div', 'bb-metric bb-civic-metric');
    card.append(element('strong', '', value), element('span', '', label));
    if (detail) card.append(element('small', '', detail));
    return card;
  }

  function renderProfile(target, profile, sources, options) {
    const city = profile.city;
    const population = profile.population;
    const barangays = profile.barangays;
    const heading = element('div', 'bb-section-heading');
    const titleWrap = element('div');
    titleWrap.append(element('span', 'bb-eyebrow', options.eyebrow), element('h2', '', options.title));
    heading.append(titleWrap);
    const metrics = element('div', 'bb-metrics bb-civic-metrics');
    metrics.append(
      metric('Official city name', city.officialName),
      metric('Region', city.region),
      metric('Classification', city.classification),
      metric('Population', new Intl.NumberFormat('en-US').format(population.value), population.census + ' · Reference date: ' + formatDate(population.referenceDate))
    );
    if (options.includeCodes) {
      metrics.append(metric('Barangays', String(barangays.count)), metric('PSGC code', city.psgcCode), metric('PSGC correspondence code', city.psgcCorrespondenceCode));
    } else {
      metrics.append(metric('Barangays', String(barangays.count)));
    }
    const profileProvenance = provenance({
      sources: sources,
      sourceId: profile.sources[0].sourceId,
      url: profile.sources[0].url,
      referenceDate: population.referenceDate,
      lastVerified: profile.verification.lastVerified
    });
    const sourceDetails = element('details', 'bb-profile-sources');
    sourceDetails.append(element('summary', '', 'Profile source details'));
    const sourceList = element('ul');
    profile.sources.forEach(function (entry) {
      const item = element('li');
      const link = officialLink(entry.url);
      if (link) {
        link.textContent = 'Official source for ' + entry.supports.join(', ');
        item.append(link);
      }
      sourceList.append(item);
    });
    sourceDetails.append(sourceList);
    target.replaceChildren(heading, metrics, profileProvenance, sourceDetails);
  }

  function renderEmergency(target, emergency, sources) {
    const hotline = (emergency.contacts || []).find(function (contact) { return contact.id === 'unified-911'; });
    if (!hotline) return failure(target);
    const section = element('section', 'bb-emergency-callout');
    section.setAttribute('aria-labelledby', 'unified-911-heading');
    const title = element('h2', '', 'Emergency assistance');
    title.id = 'unified-911-heading';
    const link = element('a', 'bb-911-link', hotline.sourceValue);
    link.href = 'tel:' + hotline.normalizedValue;
    link.setAttribute('aria-label', 'Call Unified 911 emergency hotline');
    section.append(title, link, element('p', '', 'Call 911 for nationwide emergency assistance involving police, fire, medical, rescue, and other emergency response.'));
    const evidence = hotline.evidence && hotline.evidence[0];
    section.append(provenance({
      sources: sources,
      sourceId: evidence && evidence.sourceId,
      url: evidence && evidence.specificSourceUrl,
      lastVerified: hotline.verification.lastVerified
    }));
    target.replaceChildren(section);
  }

  function typeLabel(type) {
    return ({ email: 'Email', mobile: 'Mobile', phone: 'Phone', officialPortal: 'Official portal' })[type] || 'Verified contact';
  }

  function contactLink(contact) {
    const value = contact.value;
    if (contact.type === 'email') {
      const link = element('a', '', value);
      link.href = 'mailto:' + value;
      return link;
    }
    if (contact.type === 'officialPortal') return officialLink(value);
    if ((contact.type === 'phone' || contact.type === 'mobile') && /^[+\d\s().-]+$/.test(value) && /\d/.test(value)) {
      const link = element('a', '', value);
      link.href = 'tel:' + value.replace(/[^\d+]/g, '');
      return link;
    }
    return element('span', '', value);
  }

  function contactDetails(contact, sources) {
    const details = element('details', 'bb-contact-source');
    details.append(element('summary', '', 'Source details'));
    details.append(provenance({
      sources: sources,
      sourceId: contact.sourceId,
      url: contact.specificSourceUrl,
      lastVerified: contact.lastVerified
    }));
    return details;
  }

  function renderDirectory(target, offices, contactData, sources) {
    const records = offices.offices || [];
    const contacts = new Map((contactData.offices || []).map(function (record) { return [record.officeId, record]; }));
    const heading = element('div', 'bb-section-heading');
    const headingText = element('div');
    headingText.append(element('span', 'bb-eyebrow', 'Verified directory'), element('h2', '', 'Tacloban office directory'));
    heading.append(headingText, element('p', '', records.length + ' offices listed by the City Government of Tacloban.'));
    const caveat = element('div', 'bb-callout bb-directory-caveat');
    caveat.append(element('strong', '', 'Directory scope.'), document.createTextNode(' A listing confirms appearance in the official City Government directory. It does not by itself verify current operating status, and only separately verified contact channels are displayed.'));
    const directory = element('div', 'bb-directory');
    const sectors = [];
    records.forEach(function (office) { if (!sectors.includes(office.sector)) sectors.push(office.sector); });
    sectors.forEach(function (sector) {
      const group = element('section', 'bb-directory-sector');
      group.append(element('h3', '', sector));
      const grid = element('div', 'bb-directory-grid');
      records.filter(function (office) { return office.sector === sector; }).forEach(function (office) {
        const card = element('article', 'bb-office-card');
        card.append(element('h4', '', office.name));
        const record = contacts.get(office.id);
        if (record && record.status === 'verified-contact' && record.contacts.length) {
          const list = element('ul', 'bb-contact-list');
          record.contacts.forEach(function (contact) {
            const item = element('li');
            item.append(element('strong', '', typeLabel(contact.type) + ': '), contactLink(contact), contactDetails(contact, sources));
            list.append(item);
          });
          card.append(list);
        } else {
          card.append(element('p', 'bb-contact-pending', 'Contact verification in progress'));
        }
        grid.append(card);
      });
      group.append(grid);
      directory.append(group);
    });
    target.replaceChildren(heading, caveat, directory);
  }

  function renderElectionCard(official) {
    const card = element('article', 'bb-election-card');
    card.append(element('p', 'bb-election-position', official.position), element('h4', '', official.name));
    return card;
  }

  function electionProvenance(election, sources) {
    const wrap = element('div', 'bb-government-provenance');
    wrap.append(element('p', '', 'Source: City Government of Tacloban · Last verified: ' + formatDate(election.lastVerified)));
    const link = namedOfficialLink(election.source && election.source.specificSourceUrl, 'Official 2025 Tacloban election-result source');
    if (link) wrap.append(link);
    return wrap;
  }

  function renderGovernment(target, election, current, sources) {
    const results = election.officials || [];
    const currentRecords = current.officials || [];
    const resultById = new Map(results.map(function (official) { return [official.id, official]; }));
    const mayor = results.filter(function (official) { return official.position === 'Mayor'; });
    const viceMayor = results.filter(function (official) { return official.position === 'Vice Mayor'; });
    const council = results.filter(function (official) { return official.position === 'City Council Member'; });
    if (results.length !== 12 || mayor.length !== 1 || viceMayor.length !== 1 || council.length !== 10 || currentRecords.length !== 12) return failure(target);

    const intro = element('div', 'bb-callout bb-government-notice');
    intro.append(element('strong', '', 'How to read this page.'), document.createTextNode(' Election results and current-office verification are different records. This page does not treat a 2025 proclamation alone as proof of current service.'));

    const electionSection = element('section', 'bb-government-section');
    electionSection.setAttribute('aria-labelledby', 'election-results-heading');
    electionSection.append(element('span', 'bb-eyebrow', 'Election record'), element('h2', '', '2025 proclaimed election results'));
    electionSection.lastElementChild.id = 'election-results-heading';
    electionSection.append(element('p', 'bb-government-explanation', 'These records reflect officials proclaimed elected following the 2025 Tacloban City local elections. Election results do not by themselves establish current office status.'));
    const executive = element('div', 'bb-election-executive');
    mayor.concat(viceMayor).forEach(function (official) { executive.append(renderElectionCard(official)); });
    electionSection.append(executive, element('h3', '', 'City Council'), element('p', 'bb-government-explanation', '10 City Council members were proclaimed elected.'));
    const councilGrid = element('div', 'bb-election-council');
    council.forEach(function (official) { councilGrid.append(renderElectionCard(official)); });
    electionSection.append(councilGrid, electionProvenance(election, sources));

    const verificationSection = element('section', 'bb-government-section bb-government-current');
    verificationSection.setAttribute('aria-labelledby', 'current-verification-heading');
    verificationSection.append(element('span', 'bb-eyebrow', 'Separate verification record'), element('h2', '', 'Current-office verification'));
    verificationSection.lastElementChild.id = 'current-verification-heading';
    verificationSection.append(element('p', 'bb-government-explanation', 'These records report only what later official evidence independently supports. A review date is not the same as an evidence date.'));
    const currentList = element('div', 'bb-current-list');
    currentRecords.forEach(function (record) {
      const electionOfficial = resultById.get(record.officialId);
      if (!electionOfficial) return;
      const card = element('article', 'bb-current-card');
      card.append(element('h3', '', electionOfficial.name), element('p', 'bb-election-position', record.position));
      if (record.currentVerificationStatus === 'verified-serving-at-evidence-date' && record.evidenceDate) {
        card.append(element('p', 'bb-status bb-status-verified', 'Serving as City Mayor according to official evidence dated ' + formatDate(record.evidenceDate) + '.'));
        const evidenceContext = element('p', 'bb-current-evidence-name', 'Evidence identifies: ' + (record.currentEvidenceName || electionOfficial.name));
        card.append(evidenceContext);
      } else {
        card.append(element('p', 'bb-status bb-status-pending', 'Current-office status: Verification in progress. Current service has not yet been independently corroborated by a later official source.'));
      }
      const details = element('details', 'bb-current-source');
      details.append(element('summary', '', 'Source and verification details'));
      const detailsBody = element('div');
      if (record.evidenceDate) detailsBody.append(element('p', '', 'Evidence date: ' + formatDate(record.evidenceDate)));
      detailsBody.append(element('p', '', 'Last reviewed: ' + formatDate(record.lastVerified)));
      (record.evidence || []).forEach(function (item) {
        const link = namedOfficialLink(item.specificSourceUrl, 'Official evidence dated ' + formatDate(item.documentDate));
        if (link) detailsBody.append(link);
      });
      details.append(detailsBody);
      card.append(details);
      currentList.append(card);
    });
    verificationSection.append(currentList);
    target.replaceChildren(intro, electionSection, verificationSection);
  }

  function run() {
    const homeProfile = document.querySelector('[data-tacloban-home-profile]');
    const homeEmergency = document.querySelector('[data-tacloban-emergency]');
    const statistics = document.querySelector('[data-tacloban-statistics]');
    const directory = document.querySelector('[data-tacloban-directory]');
    const government = document.querySelector('[data-tacloban-government]');
    if (!homeProfile && !statistics && !directory && !government) return;
    if (homeProfile || statistics) Promise.all([loadJson('sources.json'), loadJson('tacloban/city-profile.json')]).then(function (result) {
      if (homeProfile) renderProfile(homeProfile, result[1], result[0], { eyebrow: 'Verified city profile', title: 'Tacloban at a glance', includeCodes: false });
      if (statistics) renderProfile(statistics, result[1], result[0], { eyebrow: 'Limited verified profile', title: 'Basic verified statistics', includeCodes: true });
    }).catch(function () { [homeProfile, statistics].filter(Boolean).forEach(failure); });
    if (homeEmergency) Promise.all([loadJson('sources.json'), loadJson('tacloban/emergency-contacts.json')]).then(function (result) {
      renderEmergency(homeEmergency, result[1], result[0]);
    }).catch(function () { failure(homeEmergency); });
    if (directory) Promise.all([loadJson('sources.json'), loadJson('tacloban/offices.json'), loadJson('tacloban/office-contacts.json')]).then(function (result) {
      renderDirectory(directory, result[1], result[2], result[0]);
    }).catch(function () { failure(directory); });
    if (government) Promise.all([loadJson('sources.json'), loadJson('tacloban/elected-officials.json'), loadJson('tacloban/current-officials.json')]).then(function (result) {
      renderGovernment(government, result[1], result[2], result[0]);
    }).catch(function () { failure(government); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
