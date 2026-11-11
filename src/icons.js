const paths = {
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  external: '<path d="M14 4h6v6M20 4 10 14M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  monitor: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 12h16M9 20h6m-5-4v4m4-4v4"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  scholar: '<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v6l6 3 6-3v-6m4-2v7"/>',
  identity: '<circle cx="12" cy="12" r="9"/><path d="M7.5 10v6m0-9v.5M11 7h3a4.5 4.5 0 0 1 0 9h-3V7Z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  book: '<path d="M3 4h6c2 0 3 1 3 3v14c0-2-1-3-3-3H3V4Zm18 0h-6c-2 0-3 1-3 3m0 14c0-2 1-3 3-3h6V4Z"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  file: '<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6M2 12l10 6 10-6"/>',
  trace: '<path d="M6 3v14a3 3 0 0 0 3 3h4M6 8h8"/><circle cx="17" cy="8" r="3"/><circle cx="16" cy="20" r="3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
}

export function illustration(type, className = '') {
  const drawings = {
    molecule: '<path d="m32 45 22-13 22 13v26L54 84 32 71V45Zm44 0 24-14 24 14v27m-70-40V14m-22 31L15 35m17 36L15 82m61-11 24 14 24-13"/><circle cx="54" cy="14" r="4"/><circle cx="100" cy="31" r="5" class="fill-accent"/><circle cx="124" cy="72" r="4"/><path d="m39 49 15-9m15 9v17M54 76l-15-9"/>',
    reaction: '<path d="M15 82h115M20 85V18" class="faint"/><path d="M20 70c25 0 23-42 45-42s16 39 35 39h27"/><circle cx="66" cy="28" r="4" class="fill-accent"/><path d="M66 37v30m-5-5 5 5 5-5M96 30h29m-5-4 5 4-5 4" class="faint"/>',
    crystal: '<path d="m40 24 43-10 30 21-44 11-29-22Zm0 0v43l29 24 44-12V35M69 46v45M40 67l43-12 30 24M83 14v41"/><circle cx="40" cy="24" r="4"/><circle cx="69" cy="46" r="5" class="fill-accent"/><circle cx="113" cy="35" r="4"/><circle cx="69" cy="91" r="4"/>',
    phase: '<path d="M20 85h111M20 85V14" class="faint"/><path d="m24 33 34 40 23-15 18 6 26-41M24 33l57 25 44-35"/><circle cx="58" cy="73" r="5" class="fill-accent"/><circle cx="81" cy="58" r="4"/><circle cx="99" cy="64" r="3"/><path d="M58 73v12M81 58v27" class="faint"/>',
    wave: '<path d="M15 55h120" class="faint"/><path d="M15 55c8-47 16-47 24 0s16 47 24 0 16-47 24 0 16 47 24 0 16-47 24 0"/><path d="M15 55c12-27 24-27 36 0s24 27 36 0 24-27 36 0" class="faint"/><circle cx="63" cy="55" r="5" class="fill-accent"/>',
    surface: '<path d="m24 66 26-14 26 14 26-14 26 14m-104 0 26 14 26-14 26 14 26-14M24 82l26 14 26-14 26 14 26-14M76 60V31l21-12"/><circle cx="76" cy="28" r="7" class="fill-accent"/><circle cx="99" cy="17" r="5"/><circle cx="24" cy="66" r="3"/><circle cx="76" cy="66" r="3"/><circle cx="128" cy="66" r="3"/>',
    network: '<path d="m27 28 47 25-47 27m47-27 44-27M74 53l44 28M27 28l91 53M27 80l91-54" class="faint"/><circle cx="27" cy="28" r="8"/><circle cx="27" cy="80" r="8"/><circle cx="74" cy="53" r="10" class="fill-accent"/><circle cx="118" cy="26" r="8"/><circle cx="118" cy="81" r="8"/>',
  };
  return `<svg class="science-art ${className}" viewBox="0 0 150 110" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[type] || drawings.molecule}</svg>`;
}
