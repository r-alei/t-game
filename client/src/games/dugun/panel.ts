import { DUGUN_ROLES, ROLE_LABELS, type DugunCommand, type DugunOption, type DugunRole, type DugunState } from '../../../../shared/dugun.ts';
import type { LiveClient } from '../../net/live.ts';
import type { CommentEvent, ControlCommand, Viewer } from '../../../../shared/events.ts';
import { KNOWN_GIFTS } from '../../../../shared/gifts.ts';

const PRESET_KEY = 'dugun-dernek.starting-roster.v1';

export function mountDugunPanel(host: HTMLElement, live: LiveClient): void {
  host.innerHTML = `
    <div class="admin-heading"><div><p class="eyebrow">YAYIN MASASI</p><h2>Düğün Dernek</h2></div>
      <a class="game-link" href="/?game=dugun" target="_blank" rel="noopener">Oyun ekranını aç ↗</a></div>
    <p id="dgConnection" class="muted" role="status">Oyun ekranı bekleniyor…</p>
    <div class="admin-stats"><div><small>Kalan süre</small><strong id="dgClock">—</strong></div>
      <div><small>Katılımcı</small><strong id="dgCount">0</strong></div>
      <div><small>Tempo</small><strong id="dgBpm">—</strong></div>
      <div><small>Durum</small><strong id="dgPhase">Kapalı</strong></div></div>
    <a class="game-link" href="/dayi" target="_blank" rel="noopener">Dayı ekranını aç ↗</a>
      <h3>Dayı mikrofonu</h3>
      <label class="toggle"><input id="dgMicEnabled" type="checkbox" checked>Dayı mikrofonu açık</label>
      <label>Konuşma eşiği (düşük değer daha hassas)<input id="dgMicThreshold" type="range" min="0.005" max="0.2" step="0.005" value="0.025"></label>
      <meter id="dgMicLevel" min="0" max="0.2" value="0" aria-label="Mikrofon ses seviyesi"></meter>
      <p id="dgMicStatus" class="muted compact" role="status">Dayı ekranı bekleniyor…</p>
    <fieldset id="dgControls" disabled>
      <div class="admin-toolbar">
        <button data-dg-control="pause" class="ghost">Duraklat</button><button data-dg-control="resume">Devam et</button>
        <button data-dg-action="new-wedding" class="ghost">Yeni düğün</button>
        <button data-dg-action="finish-wedding" class="ghost">Düğünü bitir / araba</button>
        <button data-dg-control="reset" class="danger">Sahneyi boşalt</button>
      </div>
      <h3>Başlangıç kadrosu ve rol atama</h3>
      <p class="muted compact">Sohbet mesajındaki kişiyi seç, ardından rolünü ata. İzleyici sahnede olmasa da gerçek hesabıyla eklenir.</p>
      <div class="chat-heading"><label>Canlı sohbette ara<input id="dgChatSearch" type="search" placeholder="İsim veya mesaj ara…"></label>
        <button id="dgChatPause" class="ghost" type="button">Listeyi dondur</button></div>
      <div id="dgChat" class="chat-list" aria-label="Canlı sohbet"></div>
      <p id="dgSelection" class="chat-selection" role="status">Henüz kişi seçilmedi.</p>
      <form id="dgAssign" class="assign-grid">
        <label>Sohbetten / sahneden kişi<select id="dgPerson"><option value="">Kişi seç…</option></select></label>
        <label>Elle ekle (isteğe bağlı)<input id="dgName" maxlength="20" placeholder="Örn. Ayşe" required autocomplete="off"></label>
        <label>Rol<select id="dgRole"></select></label><button type="submit">Kişiyi ekle / rolü ata</button>
      </form>
      <div id="dgRoles" class="admin-roles"></div>
      <div class="row"><button id="dgSaveRoster" class="ghost">Başlangıç kadrosunu kaydet</button>
        <button id="dgLoadRoster" class="ghost">Kayıtlı kadroyu uygula</button></div>
      <p class="muted compact">Kayıt, özel rol sahiplerini ve elle eklenen kişileri bu tarayıcıda saklar. Uyguladığında mevcut sahneye eklenir.</p>
      <h3>Hediye ve adet eşlemeleri</h3>
      <p class="muted compact">Her rolün hediyesini ve adedini buradan seç. Seri bitince ulaşılan en yüksek eşik tek rol verir. Tek Parmak Kalp kaynana yapmaz; varsayılan eşik 10'dur.</p>
      <div id="dgGiftRules" class="gift-rules"></div>
      <div class="admin-columns"><div>
        <h3>Süre ve tempo</h3>
        <form id="dgDurationForm"><label>Her düğünün süresi (dakika)<input id="dgDuration" type="number" min="0.1" max="120" step="0.1" value="10" required></label><button>Süreyi ayarla ve başa al</button></form>
        <form id="dgTimeForm"><label>Kalan süre (saniye)<input id="dgTime" type="number" min="1" max="7200" step="1" required></label><button>Kalan süreyi uygula</button></form>
        <div class="row"><button id="dgPlusTime" class="ghost">+30 saniye</button><button id="dgMinusTime" class="ghost">−30 saniye</button></div>
        <form id="dgTempoForm"><label>Tempo (BPM)<input id="dgTempo" type="number" min="60" max="240" step="1" value="96" required></label><button>Tempoyu uygula</button></form>
        <p class="muted compact">168 BPM ve üzeri halayı koparır. Tempo zamanla 96 BPM'e döner.</p>
      </div><div><h3>Yayını yönet</h3><div id="dgOptions" class="admin-options"></div>
        <div class="row"><button data-dg-control="sound-on" class="ghost">Ses aç</button><button data-dg-control="sound-off" class="ghost">Ses kapat</button>
        <button data-dg-control="toggle-guides" class="ghost">TikTok güvenli alanları</button></div>
        <p class="muted compact">Ses düğmesi mevcut efektleri açar; davul-zurna kaydı eklemez.</p>
        <p id="dgSoundState" class="muted compact">Ses kapalı</p>
      </div></div>
      <h3>Sahne ve kamera</h3>
      <div class="row"><button data-dg-effect="break-halay">Halayı kopar</button><button data-dg-effect="throw-groom" class="ghost">Damadı havaya at</button>
        <button data-dg-effect="confetti" class="ghost">Konfeti</button><button data-dg-effect="scold" class="ghost">Kaynana müdahalesi</button></div>
      <div class="row camera-buttons"><button data-dg-camera="auto" class="ghost">Otomatik kamera</button><button data-dg-camera="wide" class="ghost">Geniş açı</button>
        <button data-dg-camera="top" class="ghost">Üstten</button><button data-dg-camera="couple" class="ghost">Gelin ve damat</button></div>
      <h3>Katılımcılar</h3>
      <label class="search-label">İsimle ara<input id="dgSearch" type="search" placeholder="Katılımcı ara…"></label>
      <div id="dgParticipants" class="participant-list"></div>
      <p class="muted compact">Sahneden çıkarılan kişi yeniden yorum yazarsa geri katılabilir. Tören sırasında kişi/rol düzenlemek töreni bitirip çifti halaya döndürür.</p>
    </fieldset>
    <p id="dgNotice" class="admin-notice" role="status" aria-live="polite">Başlamak için oyun ekranını aç.</p>`;

  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  let state: DugunState | null = null;
  let lastStateAt = 0;
  let participantSignature = '';
  let localNoticeUntil = 0;
  const chatEvents = new Map<string, CommentEvent>();
  const chatPeople = new Map<string, Viewer>();
  let chatPaused = false;
  let frozenChat: CommentEvent[] | null = null;
  const notice = (text: string) => { get('dgNotice').textContent = text; localNoticeUntil = Date.now() + 4000; };
  const send = (command: DugunCommand) => {
    if (!state || Date.now() - lastStateAt > 4000 || !live.sendNow({ kind: 'dugun-command', command })) {
      notice('Oyun ekranına bağlantı yok. Ekranı açıp tekrar dene.');
      return false;
    }
    return true;
  };
  const controls = get<HTMLFieldSetElement>('dgControls');
  const micEnabled = get<HTMLInputElement>('dgMicEnabled');
  const micThreshold = get<HTMLInputElement>('dgMicThreshold');
  const configureMic = () => {
    if (!live.sendNow({ kind: 'dayi-command', command: { enabled: micEnabled.checked, threshold: Number(micThreshold.value) } }))
      get('dgMicStatus').textContent = 'Sunucu bağlantısı kapalı.';
  };
  micEnabled.onchange = configureMic;
  micThreshold.oninput = configureMic;
  const personSelect = get<HTMLSelectElement>('dgPerson');
  const nameInput = get<HTMLInputElement>('dgName');
  const roleSelect = get<HTMLSelectElement>('dgRole');
  for (const role of DUGUN_ROLES) roleSelect.add(new Option(ROLE_LABELS[role], role));
  personSelect.onchange = () => {
    nameInput.disabled = !!personSelect.value; nameInput.required = !personSelect.value;
    const selected = chatPeople.get(personSelect.value) ?? state?.participants.find((p) => p.viewer.id === personSelect.value)?.viewer;
    get('dgSelection').textContent = selected ? `Seçilen kişi: ${selected.name}` : 'Henüz kişi seçilmedi.';
  };
  function renderPersonOptions(): void {
    const selected = personSelect.value;
    const people = new Map(chatPeople);
    for (const p of state?.participants ?? []) people.set(p.viewer.id, p.viewer);
    personSelect.replaceChildren(new Option('Kişi seç…', ''));
    for (const viewer of people.values()) {
      const p = state?.participants.find((p) => p.viewer.id === viewer.id);
      personSelect.add(new Option(`${viewer.name} · ${p ? ROLE_LABELS[p.role] : 'sohbet'}`, viewer.id));
    }
    personSelect.value = people.has(selected) ? selected : '';
    personSelect.onchange?.(new Event('change'));
  }
  function renderChat(): void {
    const list = get('dgChat');
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 50;
    const query = get<HTMLInputElement>('dgChatSearch').value.toLocaleLowerCase('tr-TR');
    list.replaceChildren();
    for (const event of frozenChat ?? chatEvents.values()) {
      if (!`${event.viewer.name} ${event.text}`.toLocaleLowerCase('tr-TR').includes(query)) continue;
      const row = document.createElement('div'); row.className = 'chat-row';
      const content = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = event.viewer.name;
      const text = document.createElement('span'); text.textContent = event.text;
      content.append(name, text);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost'; button.textContent = 'Seç';
      button.onclick = () => {
        personSelect.value = event.viewer.id;
        personSelect.onchange?.(new Event('change'));
        roleSelect.focus();
      };
      row.append(content, button); list.append(row);
    }
    if (!list.childElementCount) list.textContent = query ? 'Aramaya uygun mesaj yok.' : 'Henüz sohbet mesajı yok. TikTok yayınına bağlan; gelen yorumlar burada görünür.';
    if (nearBottom && !chatPaused) list.scrollTop = list.scrollHeight;
  }
  function receiveChat(events: CommentEvent[]): void {
    for (const event of events) {
      chatEvents.set(event.id, event);
      chatPeople.set(event.viewer.id, event.viewer);
    }
    while (chatEvents.size > 200) chatEvents.delete(chatEvents.keys().next().value!);
    // Seçili bir kişi mesaj geçmişinden düşse de seçim korunur.
    for (const id of chatPeople.keys()) {
      if (id !== personSelect.value && ![...chatEvents.values(), ...(frozenChat ?? [])].some((event) => event.viewer.id === id)) chatPeople.delete(id);
    }
    renderPersonOptions();
    if (!chatPaused) renderChat();
  }
  get<HTMLInputElement>('dgChatSearch').oninput = renderChat;
  get('dgChatPause').onclick = () => {
    chatPaused = !chatPaused;
    frozenChat = chatPaused ? [...chatEvents.values()] : null;
    get('dgChatPause').textContent = chatPaused ? 'Canlı listeye dön' : 'Listeyi dondur';
    if (!chatPaused) renderChat();
  };
  renderChat();
  get<HTMLFormElement>('dgAssign').onsubmit = (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!personSelect.value && !name) { nameInput.focus(); return; }
    if (send({ action: 'assign', role: roleSelect.value as DugunRole,
      person: personSelect.value ? { id: personSelect.value } : { name } })) nameInput.value = '';
  };

  const optionLabels: Record<DugunOption, string> = {
    interactionsEnabled: 'İzleyici yorum ve hediyelerini işle', rolesLocked: 'Hediyelerle rol değişimini kilitle',
    kaynanaEnabled: 'Kaynananın otomatik müdahalesi', tempoFromLikes: 'Beğeniler tempoyu artırsın',
    hudVisible: 'Yayın ekranındaki yazıları göster', namesVisible: 'Karakter isimlerini göster',
  };
  const checkboxes = new Map<DugunOption, HTMLInputElement>();
  const giftInputs = new Map<string, { gift: HTMLSelectElement; customId: HTMLInputElement; count: HTMLInputElement; dirty: boolean }>();
  for (const [option, text] of Object.entries(optionLabels)) {
    const label = document.createElement('label'); label.className = 'toggle';
    const input = document.createElement('input'); input.type = 'checkbox';
    input.onchange = () => send({ action: 'set-option', option: option as DugunOption, value: input.checked });
    label.append(input, document.createTextNode(text)); get('dgOptions').append(label);
    checkboxes.set(option as DugunOption, input);
  }
  host.querySelectorAll<HTMLButtonElement>('[data-dg-control]').forEach((button) => {
    button.onclick = () => { if (!live.sendNow({ kind: 'dugun-control', command: button.dataset.dgControl as ControlCommand })) notice('Sunucu bağlantısı kapalı.'); };
  });
  host.querySelectorAll<HTMLButtonElement>('[data-dg-action]').forEach((button) => {
    button.onclick = () => send({ action: button.dataset.dgAction as 'new-wedding' | 'finish-wedding' });
  });
  host.querySelectorAll<HTMLButtonElement>('[data-dg-effect]').forEach((button) => {
    button.onclick = () => send({ action: 'effect', effect: button.dataset.dgEffect as Extract<DugunCommand, { action: 'effect' }>['effect'] });
  });
  host.querySelectorAll<HTMLButtonElement>('[data-dg-camera]').forEach((button) => {
    button.onclick = () => send({ action: 'camera', view: button.dataset.dgCamera as 'auto' | 'wide' | 'top' | 'couple' });
  });
  const numeric = (form: string, inputId: string, action: 'set-time' | 'set-duration' | 'set-tempo', multiplier = 1) => {
    const input = get<HTMLInputElement>(inputId);
    input.oninput = () => { input.dataset.dirty = 'true'; };
    get<HTMLFormElement>(form).onsubmit = (event) => {
      event.preventDefault();
      if (send({ action, value: Math.round(Number(input.value) * multiplier) })) delete input.dataset.dirty;
    };
  };
  numeric('dgDurationForm', 'dgDuration', 'set-duration', 60);
  numeric('dgTimeForm', 'dgTime', 'set-time');
  numeric('dgTempoForm', 'dgTempo', 'set-tempo');
  get('dgPlusTime').onclick = () => state && send({ action: 'set-time', value: Math.min(7200, Math.max(1, state.remainingSeconds + 30)) });
  get('dgMinusTime').onclick = () => state && send({ action: 'set-time', value: Math.max(1, state.remainingSeconds - 30) });
  get('dgSaveRoster').onclick = () => {
    if (!state) return;
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(state.participants.filter((p) => p.manual || p.role !== 'guest')
        .map((p) => ({ name: p.viewer.name, id: p.viewer.id, manual: p.manual, role: p.role }))));
      notice('Başlangıç kadrosu bu tarayıcıda kaydedildi.');
    } catch { notice('Tarayıcı kadroyu kaydedemedi.'); }
  };
  get('dgLoadRoster').onclick = () => {
    try {
      const roster: unknown = JSON.parse(localStorage.getItem(PRESET_KEY) ?? 'null');
      if (!Array.isArray(roster) || !roster.length) { notice('Henüz kayıtlı başlangıç kadrosu yok.'); return; }
      for (const person of roster) {
        if (person && typeof person.name === 'string' && DUGUN_ROLES.includes(person.role)) {
          send({ action: 'assign', role: person.role, person: person.id && !person.manual ? { id: person.id } : { name: person.name } });
        }
      }
      notice('Kayıtlı kadro sahneye uygulanıyor.');
    } catch { notice('Kadro kaydı okunamadı.'); }
  };

  function renderParticipants(): void {
    const list = get('dgParticipants'); list.replaceChildren();
    const query = get<HTMLInputElement>('dgSearch').value.toLocaleLowerCase('tr-TR');
    const participants = state?.participants.filter((p) => p.viewer.name.toLocaleLowerCase('tr-TR').includes(query)) ?? [];
    if (!participants.length) { list.textContent = 'Henüz katılımcı yok veya aramaya uygun kişi bulunamadı.'; return; }
    for (const p of participants) {
      const row = document.createElement('div'); row.className = 'participant-row';
      const info = document.createElement('span');
      const name = document.createElement('strong'); name.textContent = p.viewer.name;
      const role = document.createElement('small'); role.textContent = `${ROLE_LABELS[p.role]}${p.manual ? ' · elle eklendi' : ''}`;
      info.append(name, role); row.append(info);
      const button = (label: string, fn: () => void) => {
        const b = document.createElement('button'); b.className = 'ghost'; b.textContent = label; b.onclick = fn; row.append(b);
      };
      button('Seç', () => { personSelect.value = p.viewer.id; roleSelect.value = p.role; personSelect.onchange?.(new Event('change')); personSelect.focus(); });
      button('Göster', () => { send({ action: 'camera', view: 'person', id: p.viewer.id }); });
      button('Çıkar', () => { send({ action: 'remove', id: p.viewer.id }); });
      list.append(row);
    }
  }
  get<HTMLInputElement>('dgSearch').oninput = renderParticipants;

  function render(next: DugunState): void {
    state = next; lastStateAt = Date.now(); controls.disabled = false;
    get('dgConnection').textContent = 'Oyun ekranı bağlı · değişiklikler doğrudan sahneye uygulanır';
    const seconds = Math.ceil(next.remainingSeconds);
    get('dgClock').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    get('dgCount').textContent = String(next.participants.length);
    get('dgBpm').textContent = `${Math.round(next.tempo)} BPM`;
    get('dgPhase').textContent = next.paused ? 'Duraklatıldı' : next.phase === 'ceremony' ? 'Araba töreni' : next.musicPlaying ? 'Halay' : 'Halay durdu';
    get('dgSoundState').textContent = next.soundEnabled ? 'Efekt sesi açık' : 'Efekt sesi kapalı';
    for (const rule of next.giftRules) {
      let inputs = giftInputs.get(rule.moment);
      if (!inputs) {
        const form = document.createElement('form'); form.className = 'gift-rule';
        const title = document.createElement('strong');
        title.textContent = rule.moment === 'mendil' ? 'Halaybaşı' : rule.moment === 'ortaya' ? 'Ortaya çık' : rule.moment === 'havaya' ? 'Damadı havaya at' : ROLE_LABELS[rule.moment];
        const gift = document.createElement('select'); gift.setAttribute('aria-label', `${title.textContent} hediyesi`);
        for (const item of KNOWN_GIFTS) gift.add(new Option(item.name, item.id));
        gift.add(new Option('Buket (ad ile)', 'bouquet'));
        const customId = document.createElement('input'); customId.type = 'text'; customId.inputMode = 'numeric';
        customId.pattern = '[0-9]{1,30}'; customId.placeholder = 'Gerçek hediye kimliği';
        customId.setAttribute('aria-label', title.textContent + ' gerçek hediye kimliği');
        const count = document.createElement('input'); count.type = 'number'; count.min = '1'; count.max = '1000'; count.step = '1'; count.required = true;
        count.setAttribute('aria-label', `${title.textContent} hediye adedi`);
        const button = document.createElement('button'); button.textContent = 'Uygula'; button.className = 'ghost';
        const values = { gift, customId, count, dirty: false };
        customId.oninput = gift.onchange = count.oninput = () => { values.dirty = true; };
        form.onsubmit = (event) => {
          event.preventDefault();
          if (send({ action: 'set-gift', rule: { moment: rule.moment, giftId: customId.value.trim() || gift.value, count: Number(count.value) } })) values.dirty = false;
        };
        form.append(title, gift, customId, count, button); get('dgGiftRules').append(form);
        giftInputs.set(rule.moment, values); inputs = values;
      }
      if (!inputs.dirty && document.activeElement !== inputs.gift && document.activeElement !== inputs.count && document.activeElement !== inputs.customId) {
        if (!Array.from(inputs.gift.options).some((o) => o.value === rule.giftId)) {
          inputs.gift.add(new Option('Kimlik: ' + rule.giftId, rule.giftId));
        }
        inputs.customId.value = '';
        inputs.gift.value = rule.giftId; inputs.count.value = String(rule.count);
      }
    }
    for (const [option, checkbox] of checkboxes) checkbox.checked = next.options[option];
    for (const [id, value] of [['dgTime', seconds], ['dgDuration', Math.round(next.durationSeconds / 6) / 10], ['dgTempo', Math.round(next.tempo)]] as const) {
      const input = get<HTMLInputElement>(id);
      if (document.activeElement !== input && !input.dataset.dirty) input.value = String(value);
    }
    host.querySelectorAll<HTMLButtonElement>('[data-dg-camera]').forEach((b) => b.classList.toggle('selected', b.dataset.dgCamera === next.camera));
    if (Date.now() > localNoticeUntil) get('dgNotice').textContent = next.notice;
    const signature = JSON.stringify(next.participants);
    if (signature === participantSignature) return;
    participantSignature = signature;
    renderPersonOptions();
    const roles = get('dgRoles'); roles.replaceChildren();
    for (const role of ['gelin', 'damat', 'halaybasi', 'kaynana', 'davulcu', 'zurnaci'] as const) {
      const card = document.createElement('div'); card.className = 'admin-role';
      const title = document.createElement('small'); title.textContent = ROLE_LABELS[role];
      const name = document.createElement('strong'); name.textContent = next.participants.find((p) => p.role === role)?.viewer.name ?? 'Boş';
      const clear = document.createElement('button'); clear.className = 'ghost'; clear.textContent = 'Halaya döndür';
      clear.onclick = () => send({ action: 'clear-role', role }); clear.disabled = name.textContent === 'Boş';
      card.append(title, name, clear); roles.append(card);
    }
    renderParticipants();
  }
  live.onOpen(() => live.sendNow({ kind: 'dugun-subscribe' }));
  let lastDayiAt = 0;
  live.on((message) => {
    if (message.kind === 'dayi-state') {
      lastDayiAt = message.state ? Date.now() : 0;
      const mic = message.state;
      if (!mic) {
        get('dgMicStatus').textContent = 'Dayı ekranı bağlı değil. Dayı ekranını aç.';
        get<HTMLMeterElement>('dgMicLevel').value = 0;
      } else {
        micEnabled.checked = mic.enabled;
        if (document.activeElement !== micThreshold) micThreshold.value = String(mic.threshold);
        get<HTMLMeterElement>('dgMicLevel').value = mic.level;
        get('dgMicStatus').textContent = { off: 'Mikrofon kapalı', requesting: 'Dayı ekranında mikrofon izni bekleniyor…',
          ready: 'Mikrofon açık · ses yalnız dayı ekranında analiz edilir', unavailable: 'Mikrofon yok · Dayı ekranına tıkla veya izin ve ses girişini kontrol edip kapat/aç' }[mic.status];
      }
    }

    if (message.kind === 'dugun-chat') receiveChat(message.events);
    else if (message.kind === 'event' && message.event.type === 'comment') receiveChat([message.event]);
    else if (message.kind === 'dugun-state' && message.state) render(message.state);
    else if (message.kind === 'dugun-state') { state = null; lastStateAt = 0; }
    else if (message.kind === 'dugun-error') notice(message.message);
  });
  window.setInterval(() => {
    if (!lastDayiAt || Date.now() - lastDayiAt > 4000) {
      get('dgMicStatus').textContent = 'Dayı ekranı bağlı değil. Dayı ekranını aç.';
      get<HTMLMeterElement>('dgMicLevel').value = 0;
    }
    if (lastStateAt && Date.now() - lastStateAt < 4000) return;
    controls.disabled = true;
    get('dgConnection').textContent = 'Düğün oyun ekranı bağlı değil. Yukarıdaki bağlantıdan ekranı aç.';
    get('dgPhase').textContent = 'Bağlantı yok';
  }, 1000);
}
