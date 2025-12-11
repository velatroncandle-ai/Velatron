/* ---------------- Canvas y Sistema de Introducción ---------------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");
 
/* ---------------- Sistema de Ranking ---------------- */
// Generar o recuperar ID único del navegador
function getBrowserId() {
  let browserId = localStorage.getItem('velatronBrowserId');
  if (!browserId) {
    // Generar ID único basado en timestamp y random
    browserId = 'VLT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('velatronBrowserId', browserId);
  }
  return browserId;
}

// Obtener o pedir nombre del jugador
function getPlayerName() {
  let playerName = localStorage.getItem('velatronPlayerName');
  return playerName || null;
}

function setPlayerName(name) {
  localStorage.setItem('velatronPlayerName', name);
}

// Funciones para manejar foto de perfil
function getPlayerPhoto() {
  return localStorage.getItem('velatronPlayerPhoto') || null;
}

function setPlayerPhoto(photoData) {
  localStorage.setItem('velatronPlayerPhoto', photoData);
}

function handlePhotoUpload(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject('Debe ser una imagen');
      return;
    }
    
    // Limitar tamaño a 500KB
    if (file.size > 500000) {
      reject('La imagen debe ser menor a 500KB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar imagen a 100x100
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;
        
        // Dibujar imagen centrada y recortada
        const scale = Math.max(100 / img.width, 100 / img.height);
        const x = (100 - img.width * scale) / 2;
        const y = (100 - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        // Convertir a base64
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        resolve(photoData);
      };
      img.onerror = () => reject('Error al cargar la imagen');
      img.src = e.target.result;
    };
    reader.onerror = () => reject('Error al leer el archivo');
    reader.readAsDataURL(file);
  });
}

function getRanking() {
  const ranking = localStorage.getItem('velatronRanking');
  return ranking ? JSON.parse(ranking) : [];
}

async function saveScore(score) {
  const ranking = getRanking();
  const browserId = getBrowserId();
  let playerName = getPlayerName();
  let playerPhoto = getPlayerPhoto();
  
  // Pedir nombre si no lo tiene
  if (!playerName) {
    const { value: name } = await Swal.fire({
      title: '🎮 Registra tu perfil',
      html: `
        <p style="font-size: 18px; margin: 20px 0;">Ingresa tu nombre para aparecer en el ranking</p>
        <div style="margin: 20px 0;">
          <input type="file" id="profile-photo" accept="image/*" style="display: none;">
          <button onclick="document.getElementById('profile-photo').click()" 
                  style="background: linear-gradient(45deg, #00ffff, #0080ff); border: none; border-radius: 10px; 
                         color: #000; font-weight: bold; padding: 12px 25px; cursor: pointer; font-size: 16px;">
            📸 Subir foto (opcional)
          </button>
          <div id="photo-preview" style="margin-top: 15px;"></div>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Tu nombre de guerrero cripto',
      inputAttributes: {
        maxlength: 20,
        style: 'font-size: 20px; text-align: center; padding: 15px;'
      },
      showCancelButton: true,
      confirmButtonText: '✅ Guardar',
      cancelButtonText: '❌ Anónimo',
      didOpen: () => {
        const photoInput = document.getElementById('profile-photo');
        const preview = document.getElementById('photo-preview');
        
        photoInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (file) {
            try {
              playerPhoto = await handlePhotoUpload(file);
              preview.innerHTML = `<img src="${playerPhoto}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #00ffff;">`;
            } catch (error) {
              preview.innerHTML = `<p style="color: #ff4444;">${error}</p>`;
            }
          }
        });
      },
      inputValidator: (value) => {
        if (value && value.trim().length > 0) {
          return null;
        }
      },
      backdrop: 'rgba(0, 0, 0, 0.8)',
      customClass: {
        popup: 'game-over-popup'
      }
    });
    
    playerName = name && name.trim().length > 0 ? name.trim() : 'Anónimo';
    setPlayerName(playerName);
    if (playerPhoto) {
      setPlayerPhoto(playerPhoto);
    }
  }
  
  const newEntry = {
    score: score,
    name: playerName,
    photo: playerPhoto,
    browserId: browserId,
    date: new Date().toLocaleString('es-ES')
  };
  
  ranking.push(newEntry);
  ranking.sort((a, b) => b.score - a.score);
  
  // Mantener solo los top 10
  const top10 = ranking.slice(0, 10);
  localStorage.setItem('velatronRanking', JSON.stringify(top10));
  
  return top10;
}

function getPlayerPosition(score, browserId) {
  const ranking = getRanking();
  let position = 1;
  for (let entry of ranking) {
    if (score > entry.score) break;
    if (score === entry.score && entry.browserId === browserId) break;
    position++;
  }
  return position;
}

function formatRankingHTML(ranking, currentScore = null, currentBrowserId = null) {
  if (ranking.length === 0) {
    return '<div style="color: #888; font-size: 18px; margin: 20px 0;">No hay puntuaciones aún</div>';
  }
  
  let html = '<div style="margin: 30px 0; max-height: 400px; overflow-y: auto;">';
  html += '<table style="width: 100%; border-collapse: collapse; font-family: \'Inter\', Arial, sans-serif;">';
  
  ranking.forEach((entry, index) => {
    const isCurrentPlayer = currentBrowserId && entry.browserId === currentBrowserId && entry.score === currentScore;
    const bgColor = isCurrentPlayer ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
    const textColor = isCurrentPlayer ? '#00ffff' : '#ffffff';
    const fontWeight = isCurrentPlayer ? 'bold' : 'normal';
    
    let medal = '';
    if (index === 0) medal = '🥇';
    else if (index === 1) medal = '🥈';
    else if (index === 2) medal = '🥉';
    
    const playerIndicator = isCurrentPlayer ? ' 👈' : '';
    
    // Avatar: usar foto si existe, sino emoji por defecto
    const avatar = entry.photo 
      ? `<img src="${entry.photo}" style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid ${textColor}; vertical-align: middle; margin-right: 8px;">` 
      : '<span style="font-size: 28px; vertical-align: middle; margin-right: 8px;">👽</span>';
    
    html += `
      <tr style="background: ${bgColor}; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <td style="padding: 12px 8px; text-align: center; color: ${textColor}; font-weight: ${fontWeight}; font-size: 18px; width: 12%;">${medal} #${index + 1}</td>
        <td style="padding: 12px 8px; text-align: left; color: ${textColor}; font-weight: ${fontWeight}; font-size: 16px; width: 40%;">${avatar}${entry.name}${playerIndicator}</td>
        <td style="padding: 12px 8px; text-align: center; color: ${textColor}; font-weight: ${fontWeight}; font-size: 22px; width: 18%;">${entry.score}</td>
        <td style="padding: 12px 8px; text-align: center; color: #aaa; font-size: 11px; width: 30%;">${entry.date}</td>
      </tr>
    `;
  });
  
  html += '</table></div>';
  return html;
}

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Variables para la introducción
let introActive = true;
let gameStarted = false;
let gamePaused = false;

function initGame() {
  resizeCanvas();
  createStars();
  playIntroMusic();
  
  // Ocultar elementos del juego durante la intro
  canvas.style.display = 'none';
  hud.style.display = 'none';
  document.getElementById('game-stars').style.display = 'none';
}

function createStars() {
  const starsContainer = document.getElementById('stars-container');
  const numStars = window.innerWidth < 768 ? 50 : 100;
  
  for (let i = 0; i < numStars; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    
    // Posición aleatoria
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    
    // Tamaño aleatorio
    const size = Math.random() * 3 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    
    // Algunas estrellas se mueven
    if (Math.random() < 0.3) {
      star.classList.add('moving');
      star.style.animationDelay = Math.random() * 3 + 's';
    } else {
      star.style.animationDelay = Math.random() * 2 + 's';
    }
    
    starsContainer.appendChild(star);
  }
}

function createGameStars() {
  const gameStarsContainer = document.getElementById('game-stars');
  const numStars = window.innerWidth < 768 ? 80 : 150;
  
  // Limpiar estrellas existentes
  gameStarsContainer.innerHTML = '';
  
  for (let i = 0; i < numStars; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    
    // Posición aleatoria
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    
    // Tamaño aleatorio (más pequeñas para no distraer del juego)
    const size = Math.random() * 2 + 0.5;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    
    // Menos estrellas en movimiento para el juego
    if (Math.random() < 0.2) {
      star.classList.add('moving');
      star.style.animationDelay = Math.random() * 5 + 's';
      star.style.animationDuration = (Math.random() * 4 + 4) + 's';
    } else {
      star.style.animationDelay = Math.random() * 3 + 's';
    }
    
    gameStarsContainer.appendChild(star);
  }
}

function playIntroMusic() {
  if (!audioInitialized) return;
  
  // Secuencia musical épica
  setTimeout(() => {
    createTone(220, 0.5, 'sawtooth', 0.1); // A
  }, 500);
  
  setTimeout(() => {
    createTone(330, 0.5, 'sawtooth', 0.12); // E
  }, 1000);
  
  setTimeout(() => {
    createTone(440, 0.5, 'sawtooth', 0.15); // A
  }, 1500);
  
  setTimeout(() => {
    createTone(550, 1, 'sawtooth', 0.18); // C#
  }, 2000);
  
  // Acordes de fondo
  setTimeout(() => {
    createTone(110, 2, 'sine', 0.08); // A bajo
    createTone(220, 2, 'sine', 0.06); // A
    createTone(330, 2, 'sine', 0.04); // E
  }, 2500);
}

function startGame() {
  initAudio(); // Asegurar que el audio esté inicializado
  
  // Efecto de sonido de inicio
  createTone(800, 0.3, 'square', 0.2);
  setTimeout(() => createTone(1200, 0.3, 'square', 0.25), 150);
  setTimeout(() => createTone(1600, 0.5, 'square', 0.3), 300);
  
  // Ocultar introducción con animación
  const intro = document.getElementById('cinematic-intro');
  intro.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
  intro.style.opacity = '0';
  intro.style.transform = 'scale(1.1)';
  
  setTimeout(() => {
    intro.classList.add('intro-hidden');
    canvas.style.display = 'block';
    hud.style.display = 'block';
    
    // Crear estrellas para el fondo del juego
    createGameStars();
    document.getElementById('game-stars').style.display = 'block';
    
    gameStarted = true;
    introActive = false;
    
    // Iniciar música de fondo
    playBackgroundMusic();
    
    // Iniciar el juego
    resizeCanvas();
    if (!window.gameLoopStarted) {
      requestAnimationFrame(loop);
      window.gameLoopStarted = true;
    }
  }, 1000);
}

/* ---------------- Estado ---------------- */
let WIDTH = canvas.width;
let HEIGHT = canvas.height;

let running = true;
let score = 0;
let lives = 3;
let lastTime = 0;

/* ---------------- Jugador ---------------- */
const playerImg = new Image();
playerImg.src = "velatron.jpg"; // Asegúrate de tener este archivo también

const osoImg = new Image();
osoImg.src = "oso.png"; // ¡Este es el spritesheet del oso!

// Imagen de fondo desplazable
const backgroundImg = new Image();
backgroundImg.src = "fondo.png";

// Variables para el fondo desplazable
let backgroundY = 0; // Posición única del fondo
let backgroundSpeed = 1.5; // Velocidad de desplazamiento del fondo (ajustada para sincronizar con caminata)
let backgroundLoaded = false;
let backgroundHeight = 0; // Altura escalada del fondo
let backgroundScale = 1; // Factor de escala del fondo

// Detectar cuando se carga la imagen de fondo
backgroundImg.onload = function() {
  backgroundLoaded = true;
  console.log('Fondo cargado:', this.width + 'x' + this.height);
};

// Configuración del spritesheet de osos con armadura galáctica
const bearSpriteConfig = {
  frameWidth: 0, // Se calculará cuando se cargue la imagen
  frameHeight: 0,
  // Animaciones: 4 frames caminata + 4 frames ataque con hacha
  walkFrames: 4,
  attackFrames: 4,
  totalFrames: 8, // 4 caminata + 4 ataque
  framesPerRow: 4, // Layout del spritesheet
  walkStartFrame: 0, // Frames 0-3 para caminar
  attackStartFrame: 4 // Frames 4-7 para ataque con hacha
};

// Detectar automáticamente las dimensiones cuando se carga la imagen
osoImg.onload = function() {
  // Para un spritesheet de 4 frames en una fila horizontal
  bearSpriteConfig.frameWidth = Math.floor(this.width / bearSpriteConfig.framesPerRow);
  bearSpriteConfig.frameHeight = Math.floor(this.height / Math.ceil(bearSpriteConfig.totalFrames / bearSpriteConfig.framesPerRow));
  console.log('Spritesheet de osos galácticos cargado:', bearSpriteConfig);
  console.log('Dimensiones de frame:', bearSpriteConfig.frameWidth + 'x' + bearSpriteConfig.frameHeight);
};

/* ---------------- Audio ---------------- */
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioInitialized = false;

// Música de fondo
let backgroundMusic = null;
let musicPlaying = false;

// Función para crear sonidos sintéticos
function createTone(frequency, duration, type = 'sine', volume = 0.3) {
  if (!audioInitialized) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// Sonidos del juego
function playLaserSound() {
  createTone(800, 0.15, 'sawtooth', 0.2);
  setTimeout(() => createTone(1200, 0.1, 'sine', 0.15), 50);
}

function playSwordSound() {
  createTone(400, 0.2, 'square', 0.25);
  setTimeout(() => createTone(600, 0.15, 'sawtooth', 0.2), 80);
}

function playExplosionSound() {
  // Explosión con ruido blanco
  if (!audioInitialized) return;
  
  const bufferSize = audioContext.sampleRate * 0.3;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  
  source.buffer = buffer;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
  
  source.start();
}

function playHitSound() {
  createTone(200, 0.3, 'sawtooth', 0.3);
  setTimeout(() => createTone(150, 0.2, 'triangle', 0.25), 100);
}

// Funciones para música de fondo
function initBackgroundMusic() {
  if (!backgroundMusic) {
    backgroundMusic = new Audio('velatron.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3; // Volumen moderado
    
    // Manejar errores de carga
    backgroundMusic.onerror = function() {
      console.log('No se pudo cargar velatron.mp3');
    };
  }
}

function playBackgroundMusic() {
  initBackgroundMusic();
  if (backgroundMusic && !musicPlaying) {
    backgroundMusic.play().then(() => {
      musicPlaying = true;
      console.log('Música de fondo iniciada');
    }).catch(error => {
      console.log('Error al reproducir música:', error);
    });
  }
}

function stopBackgroundMusic() {
  if (backgroundMusic && musicPlaying) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    musicPlaying = false;
    console.log('Música de fondo detenida');
  }
}

// Inicializar audio en la primera interacción
function initAudio() {
  if (audioInitialized) return;
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  audioInitialized = true;
  
  // Reproducir música de introducción si estamos en la intro
  if (introActive) {
    setTimeout(() => playIntroMusic(), 100);
  }
}

/* ---------------- Alertas Velatron ---------------- */
async function showGameOver(finalScore) {
  // Pausar el juego y detener música cuando aparece Game Over
  gamePaused = true;
  stopBackgroundMusic();
  
  // Guardar puntuación y obtener ranking (async)
  const ranking = await saveScore(finalScore);
  const browserId = getBrowserId();
  const position = getPlayerPosition(finalScore, browserId);
  
  Swal.fire({
    title: '⚡ GAME OVER ⚡',
    html: `
      <div style="text-align: center; font-family: 'Inter', Arial, sans-serif;">
        <div style="font-size: clamp(20px, 6vw, 28px); margin: 20px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">
          🚀 <span style="background: linear-gradient(45deg, #ff4444, #ff8888); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">VELATRON DESTRUIDO</span> 🚀
        </div>
        <div style="font-size: clamp(32px, 10vw, 48px); color: #00ffff; margin: 30px 0; font-weight: 900; text-shadow: 0 0 20px rgba(0, 255, 255, 0.8); letter-spacing: 0.05em;">
          🏆 ${finalScore}
        </div>
        <div style="font-size: clamp(18px, 5vw, 24px); color: #ffaa00; margin: 15px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">
          Posición: #${position}
        </div>
        <div style="font-size: clamp(16px, 4vw, 20px); opacity: 0.9; margin: 20px 0; line-height: 1.6; font-weight: 500;">
          Los osos han conquistado el mercado...<br>
          ¿Intentarás salvar el universo cripto de nuevo?
        </div>
        <div style="margin-top: 30px; border-top: 2px solid rgba(0, 255, 255, 0.3); padding-top: 20px;">
          <div style="font-size: clamp(22px, 5vw, 28px); color: #00ffff; margin-bottom: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; text-shadow: 0 0 10px rgba(0, 255, 255, 0.6);">📊 TOP 10 RANKING 📊</div>
          ${formatRankingHTML(ranking, finalScore, browserId)}
        </div>
      </div>
    `,
    icon: 'error',
    iconColor: '#ff4444',
    showCancelButton: true,
    confirmButtonText: '🔄 REINICIAR MISIÓN',
    cancelButtonText: '❌ ABANDONAR',
    allowOutsideClick: false,
    allowEscapeKey: false,
    backdrop: 'rgba(0, 0, 0, 0.8)',
    width: 'auto',
    customClass: {
      popup: 'game-over-popup'
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // Reanudar el juego antes de recargar
      gamePaused = false;
      document.location.reload();
    } else {
      // Cerrar la página/pestaña cuando elige abandonar
      gamePaused = false;
      window.close();
      // Si window.close() no funciona (algunas restricciones del navegador),
      // intentar redirigir a una página en blanco
      setTimeout(() => {
        window.location.href = 'about:blank';
      }, 100);
    }
  });
}

async function showVictory(finalScore) {
  // Pausar el juego y detener música cuando aparece Victoria
  gamePaused = true;
  stopBackgroundMusic();
  
  // Guardar puntuación y obtener ranking (async)
  const ranking = await saveScore(finalScore);
  const browserId = getBrowserId();
  const position = getPlayerPosition(finalScore, browserId);
  
  Swal.fire({
    title: '🌟 ¡VICTORIA ÉPICA! 🌟',
    html: `
      <div style="text-align: center; font-family: 'Inter', Arial, sans-serif;">
        <div style="font-size: clamp(20px, 6vw, 28px); margin: 20px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">
          ⚡ <span style="background: linear-gradient(45deg, #00ffff, #0080ff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">VELATRON TRIUNFANTE</span> ⚡
        </div>
        <div style="font-size: clamp(32px, 10vw, 48px); color: #00ffff; margin: 30px 0; font-weight: 900; text-shadow: 0 0 20px rgba(0, 255, 255, 0.8); letter-spacing: 0.05em;">
          🏆 ${finalScore}
        </div>
        <div style="font-size: clamp(18px, 5vw, 24px); color: #ffaa00; margin: 15px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">
          Posición: #${position}
        </div>
        <div style="font-size: clamp(16px, 4vw, 20px); opacity: 0.9; margin: 20px 0; line-height: 1.6; font-weight: 500;">
          ¡Has salvado la galaxia!<br>
          Los osos han sido derrotados.
        </div>
        <div style="margin-top: 30px; border-top: 2px solid rgba(0, 255, 255, 0.3); padding-top: 20px;">
          <div style="font-size: clamp(22px, 5vw, 28px); color: #00ffff; margin-bottom: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; text-shadow: 0 0 10px rgba(0, 255, 255, 0.6);">📊 TOP 10 RANKING 📊</div>
          ${formatRankingHTML(ranking, finalScore, browserId)}
        </div>
      </div>
    `,
    icon: 'success',
    iconColor: '#00ffff',
    confirmButtonText: '🎮 JUGAR DE NUEVO',
    backdrop: 'rgba(0, 50, 100, 0.8)',
    width: 'auto',
    customClass: {
      popup: 'victory-popup'
    }
  }).then(() => {
    // Reanudar el juego antes de recargar
    gamePaused = false;
    document.location.reload();
  });
}

const player = {
  x: 100,
  y: HEIGHT - 20,
  w: 288,
  h: 288,
  vx: 0,
  speed: 15,
  facing: 1,
  attacking: false,
  attackStart: 0,
  attackDuration: 220,
  // Animación de caminata hacia adelante
  walkCycle: 0,
  walkSpeed: 0.08,
  bobAmount: 8, // Cantidad de movimiento vertical
  sideAmount: 3, // Cantidad de movimiento horizontal
  baseY: HEIGHT - 120 // Posición Y base
};

let keys = {};

/* ---------------- Osos ---------------- */
let bears = [];
let heads = [];
let spawnTimer = 0;
let spawnInterval = 1200;

/* ---------------- Láseres ---------------- */
let lasers = [];
let lastShot = 0;
let shootCooldown = 300; // 300ms entre disparos

/* ---------------- Explosiones ---------------- */
let explosions = [];

function spawnBear(){
  // Tamaño responsivo: 30-40% del ancho del canvas, mínimo 200px, máximo 350px
  const baseSize = Math.min(Math.max(WIDTH * 0.35, 200), 350);
  // Variación aleatoria del tamaño (90% a 110% del tamaño base)
  const size = baseSize * (0.9 + Math.random() * 0.2);
  
  // Calcular multiplicador de velocidad basado en múltiplos de 400 puntos
  const speedMultiplier = 1 + Math.floor(score / 400) * 0.3; // +30% por cada 400 puntos
  const baseSpeed = (1 + Math.random() * 1.8) * speedMultiplier;
  
  bears.push({
    x: Math.random()*(WIDTH - size - 40) + 20,
    y: -size - 40,
    w: size,
    h: size,
    speed: baseSpeed,
    // Propiedades de animación spritesheet para osos galácticos
    animTime: 0,
    currentFrame: 0,
    frameTimer: 0,
    frameInterval: 150 + Math.random() * 100, // Animación más fluida
    // Estados de animación
    animationState: 'walking', // Siempre empezar caminando
    stateTimer: 0,
    stateDuration: 1000 + Math.random() * 2000, // Duración del estado actual
    // Movimiento
    runPhase: Math.random() * Math.PI * 2,
    // Tamaño base para cálculos responsivos
    baseSize: size
  });
}

/* ---------------- Explosiones ---------------- */
function createExplosion(x, y) {
  const particles = [];
  const numParticles = 15 + Math.random() * 10;
  
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.02,
      size: 3 + Math.random() * 4,
      color: Math.random() < 0.5 ? 'orange' : 'red'
    });
  }
  
  explosions.push({
    particles: particles,
    time: 0,
    duration: 1000
  });
}

/* ---------------- ATAQUE tipo sable láser verde ---------------- */
function getSwordRegion(){
  const width = 150;
  const height = 26;

  if (player.facing === 1){
    return { x: player.x + player.w*0.75, y: player.y + player.h*0.33, w: width, h: height };
  } else {
    return { x: player.x - width*0.78, y: player.y + player.h*0.33, w: width, h: height };
  }
}

function startAttack(){
  if (player.attacking) return;
  player.attacking = true;
  player.attackStart = performance.now();
  playSwordSound(); // Sonido de sable láser
}

/* ---------------- Disparo de Láser ---------------- */
function shootLaser(){
  const now = performance.now();
  if (now - lastShot < shootCooldown) return;
  
  lastShot = now;
  playLaserSound(); // Sonido de disparo
  
  // Calcular posición de la pistola según la dirección del jugador
  let gunX, gunY;
  
  if (player.facing === 1) {
    // Mirando a la derecha - pistola en la mano derecha (brazo extendido adelante)
    gunX = player.x + player.w * 0.75; // Adelante del personaje
    gunY = player.y + player.h * 0.35; // Altura del brazo extendido
  } else {
    // Mirando a la izquierda - pistola en la mano derecha (que ahora está del otro lado)
    gunX = player.x + player.w * 0.25; // Lado izquierdo cuando está volteado
    gunY = player.y + player.h * 0.35; // Altura del brazo extendido
  }
  
  // Crear láser desde la posición de la pistola
  lasers.push({
    x: gunX - 8,
    y: gunY,
    w: 16,
    h: 35,
    speed: 12,
    glow: 0
  });
}

/* ---------------- Controles táctiles ---------------- */
let touchX = null;
let lastTouchTime = 0;

canvas.addEventListener("touchstart", e => {
  // Solo procesar toques si el juego ha comenzado y no está pausado
  if (!gameStarted || introActive || gamePaused) return;
  
  e.preventDefault();
  initAudio(); // Inicializar audio en primera interacción
  const t = e.touches[0];
  const px = player.x + player.w/2;
  const now = performance.now();

  // doble toque = disparar láser
  if (now - lastTouchTime < 300) {
    shootLaser();
    lastTouchTime = 0;
    return;
  }
  lastTouchTime = now;

  // tocar en el cuerpo del jugador = ataque
  if (t.clientY >= player.y && t.clientY <= player.y + player.h) {
    startAttack();
    return;
  }

  // mover izquierda o derecha
  if (t.clientX < px){
    keys["left"] = true;
    keys["right"] = false;
  } else {
    keys["right"] = true;
    keys["left"] = false;
  }
});

canvas.addEventListener("touchmove", e => {
  // Solo procesar toques si el juego ha comenzado y no está pausado
  if (!gameStarted || introActive || gamePaused) return;
  
  e.preventDefault();
  const t = e.touches[0];
  const px = player.x + player.w/2;

  if (t.clientX < px){
    keys["left"] = true;
    keys["right"] = false;
  } else {
    keys["right"] = true;
    keys["left"] = false;
  }
});

canvas.addEventListener("touchend", e => {
  // Solo procesar toques si el juego ha comenzado y no está pausado
  if (!gameStarted || introActive || gamePaused) return;
  
  e.preventDefault();
  keys["left"] = false;
  keys["right"] = false;
});

/* ---------------- Controles de teclado ---------------- */
document.addEventListener("keydown", e => {
  initAudio(); // Inicializar audio en primera interacción
  
  // Si estamos en la introducción, Enter o Espacio inicia el juego
  if (introActive) {
    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      startGame();
    }
    return;
  }
  
  // Solo procesar controles si el juego ha comenzado y no está pausado
  if (!gameStarted || gamePaused) return;
  
  switch(e.code) {
    case "ArrowLeft":
    case "KeyA":
      keys["left"] = true;
      break;
    case "ArrowRight":
    case "KeyD":
      keys["right"] = true;
      break;
    case "Space":
      e.preventDefault();
      shootLaser();
      break;
    case "KeyZ":
    case "Enter":
      startAttack();
      break;
  }
});

document.addEventListener("keyup", e => {
  // Solo procesar controles si el juego ha comenzado y no está pausado
  if (!gameStarted || introActive || gamePaused) return;
  
  switch(e.code) {
    case "ArrowLeft":
    case "KeyA":
      keys["left"] = false;
      break;
    case "ArrowRight":
    case "KeyD":
      keys["right"] = false;
      break;
  }
});

/* ---------------- Colisiones ---------------- */
function rectsCollide(a,b){
  return a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y;
}

/* ---------------- Update ---------------- */
function update(dt){
  WIDTH = canvas.width;
  HEIGHT = canvas.height;
  player.y = HEIGHT - 450;

  // Actualizar posición del fondo desplazable
  if (backgroundLoaded && backgroundImg.complete) {
    // Calcular el escalado una vez
    if (backgroundHeight === 0) {
      const scaleX = WIDTH / backgroundImg.width;
      const scaleY = HEIGHT / backgroundImg.height;
      backgroundScale = Math.max(scaleX, scaleY);
      backgroundHeight = backgroundImg.height * backgroundScale;
      backgroundY = 0;
    }
    
    // Incrementar posición del fondo
    backgroundY += backgroundSpeed;
    
    // Resetear posición cuando completa un ciclo (módulo para bucle perfecto)
    if (backgroundY >= backgroundHeight) {
      backgroundY = backgroundY % backgroundHeight;
    }
  }

  // movimiento
  player.vx = 0;
  if (keys.left) { player.vx = -player.speed; player.facing = -1; }
  if (keys.right){ player.vx =  player.speed; player.facing =  1; }

  player.x += player.vx;
  player.x = Math.max(10, Math.min(WIDTH - player.w - 10, player.x));

  // Animación de caminata hacia adelante (siempre activa)
  player.walkCycle += player.walkSpeed;
  player.baseY = HEIGHT - 370;
  
  // Movimiento de caminata: bobbing vertical y sway horizontal sutil
  const walkBob = Math.sin(player.walkCycle) * player.bobAmount;
  const walkSway = Math.sin(player.walkCycle * 0.7) * player.sideAmount;
  
  player.y = player.baseY + walkBob;
  // Añadir sway horizontal muy sutil cuando no se mueve lateralmente
  if (player.vx === 0) {
    player.walkOffsetX = walkSway;
  } else {
    player.walkOffsetX = 0; // Sin sway cuando se mueve lateralmente
  }

  // ataque
  if (player.attacking){
    if (performance.now() - player.attackStart > player.attackDuration){
      player.attacking = false;
    }
  }

  // osos
  for (let i = bears.length - 1; i >= 0; i--){
    const b = bears[i];
    b.y += b.speed;
    
    // Animación de osos galácticos con armadura
    b.animTime += dt;
    b.frameTimer += dt;
    b.stateTimer += dt;
    b.runPhase += dt * 0.006; // Movimiento más suave para osos grandes
    
    // Cambiar estado de animación periódicamente
    if (b.stateTimer >= b.stateDuration) {
      b.stateTimer = 0;
      b.stateDuration = 1500 + Math.random() * 2500;
      b.animationState = Math.random() < 0.9 ? 'walking' : 'attacking'; // 90% caminata, 10% ataque
      b.currentFrame = 0; // Reiniciar animación
    }
    
    // Cambiar frame de animación según el estado
    if (b.frameTimer >= b.frameInterval) {
      b.frameTimer = 0;
      
      if (b.animationState === 'walking') {
        b.currentFrame = (b.currentFrame + 1) % bearSpriteConfig.walkFrames;
      } else if (b.animationState === 'attacking') {
        b.currentFrame = (b.currentFrame + 1) % bearSpriteConfig.attackFrames;
      }
    }
    
    // Movimiento horizontal más sutil para osos grandes
    const horizontalSway = Math.sin(b.runPhase * 1.2) * (b.baseSize * 0.08);
    b.currentX = b.x + horizontalSway;

    // Crear rectángulo de colisión con posición animada
    const bearCollisionRect = {
      x: b.currentX || b.x,
      y: b.y,
      w: b.w,
      h: b.h
    };
    
    // golpe al jugador
    if (rectsCollide(bearCollisionRect, player)){
      lives--;
      bears.splice(i,1);
      playHitSound(); // Sonido de daño
      if (lives <= 0){
        showGameOver(score);
      }
      continue;
    }

    // golpe con el sable verde
    if (player.attacking){
      const s = getSwordRegion();
      if (rectsCollide(s, bearCollisionRect)){
        score += 25;
        bears.splice(i,1);
        playExplosionSound(); // Sonido de explosión
        continue;
      }
    }

    if (b.y > HEIGHT + 80){
      bears.splice(i,1);
      lives--;
    }
  }

  // explosiones
  for (let i = explosions.length - 1; i >= 0; i--){
    const explosion = explosions[i];
    explosion.time += dt;
    
    // actualizar partículas
    for (let j = explosion.particles.length - 1; j >= 0; j--){
      const p = explosion.particles[j];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.vy += 0.1; // gravedad ligera
      
      if (p.life <= 0){
        explosion.particles.splice(j, 1);
      }
    }
    
    // eliminar explosión cuando no quedan partículas
    if (explosion.particles.length === 0 || explosion.time > explosion.duration){
      explosions.splice(i, 1);
    }
  }

  // láseres
  for (let i = lasers.length - 1; i >= 0; i--){
    const l = lasers[i];
    l.y -= l.speed;
    l.glow = (l.glow + 0.1) % (Math.PI * 2);

    // colisión láser-oso
    for (let j = bears.length - 1; j >= 0; j--){
      const b = bears[j];
      const bearCollisionRect = {
        x: b.currentX || b.x,
        y: b.y,
        w: b.w,
        h: b.h
      };
      
      if (rectsCollide(l, bearCollisionRect)){
        score += 50; // más puntos por disparar
        
        // Crear explosión en el centro del oso (posición animada)
        createExplosion((b.currentX || b.x) + b.w/2, b.y + b.h/2);
        
        bears.splice(j, 1);
        lasers.splice(i, 1);
        playExplosionSound(); // Sonido de explosión
        break;
      }
    }

    // eliminar láseres que salen de pantalla
    if (l.y < -50){
      lasers.splice(i, 1);
    }
  }

  // spawn - ajustado para osos galácticos más grandes
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval){
    spawnTimer = 0;
    spawnBear();
    // Intervalo más lento para osos más grandes y peligrosos
    spawnInterval = Math.max(800, spawnInterval - 8);
  }

  hud.textContent = `Puntos: ${score} · Vidas: ${lives}`;
}

/* ---------------- Draw ---------------- */
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Dibujar fondo desplazable con bucle perfecto
  if (backgroundLoaded && backgroundImg.complete && backgroundHeight > 0) {
    ctx.save();
    
    const scaledWidth = backgroundImg.width * backgroundScale;
    const scaledHeight = backgroundHeight;
    
    // Centrar horizontalmente si es necesario
    const offsetX = (WIDTH - scaledWidth) / 2;
    
    // Usar módulo para obtener el offset actual dentro de un ciclo
    const currentOffset = backgroundY % scaledHeight;
    
    // Calcular cuántas copias necesitamos (siempre 2 como mínimo para cubrir transiciones)
    const numCopies = Math.ceil(HEIGHT / scaledHeight) + 2;
    
    // Dibujar múltiples copias del fondo comenzando desde la posición con offset
    for (let i = -1; i < numCopies; i++) {
      // Posición Y calculada con el offset del módulo
      const yPos = currentOffset + (i * scaledHeight);
      
      // Solo dibujar si está visible en pantalla (optimización)
      if (yPos + scaledHeight > 0 && yPos < HEIGHT) {
        ctx.drawImage(
          backgroundImg,
          offsetX, yPos,
          scaledWidth, scaledHeight
        );
      }
    }
    
    ctx.restore();
  }

  // suelo semi-transparente sobre el fondo
  ctx.fillStyle = "rgba(8, 19, 26, 0.3)";
  ctx.fillRect(0, HEIGHT - 40, WIDTH, 40);

  // osos con animación spritesheet
  bears.forEach(b => {
    ctx.save();
    
    // Procesar spritesheet para eliminar solo el fondo blanco (una sola vez)
    if (!window.processedBearSpritesheet && osoImg.complete) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      tempCanvas.width = osoImg.width;
      tempCanvas.height = osoImg.height;
      
      // Dibujar la imagen original
      tempCtx.drawImage(osoImg, 0, 0);
      
      // Obtener y procesar los píxeles solo para eliminar fondo blanco
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      
      // Eliminar fondo blanco/gris claro más agresivamente
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b_val = data[i + 2];
        const brightness = (r + g + b_val) / 3;
        
        // Eliminar píxeles claros (fondo blanco/gris claro)
        if (brightness > 200 || (r > 220 && g > 220 && b_val > 220)) {
          data[i + 3] = 0; // Completamente transparente
        }
        // Reducir opacidad de píxeles gris medio que puedan ser parte del fondo
        else if (brightness > 180 && Math.abs(r - g) < 20 && Math.abs(g - b_val) < 20) {
          data[i + 3] = 0; // También hacer transparente grises uniformes
        }
        // Todo lo demás mantener completamente opaco
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      window.processedBearSpritesheet = tempCanvas;
    }
    
    // Verificar que las dimensiones del frame estén disponibles
    if (!bearSpriteConfig.frameWidth || !bearSpriteConfig.frameHeight) {
      return; // No dibujar hasta que se calculen las dimensiones
    }
    
    // Usar las dimensiones calculadas exactas
    const spriteWidth = bearSpriteConfig.frameWidth;
    const spriteHeight = bearSpriteConfig.frameHeight;
    
    // Calcular frame actual según el estado de animación
    let actualFrame = b.currentFrame;
    if (b.animationState === 'attacking') {
      actualFrame = bearSpriteConfig.attackStartFrame + b.currentFrame;
    } else {
      actualFrame = bearSpriteConfig.walkStartFrame + b.currentFrame;
    }
    
    // Calcular posición del frame actual en el spritesheet con precisión
    const frameRow = Math.floor(actualFrame / bearSpriteConfig.framesPerRow);
    const frameCol = actualFrame % bearSpriteConfig.framesPerRow;
    const sourceX = Math.floor(frameCol * spriteWidth);
    const sourceY = Math.floor(frameRow * spriteHeight);
    
    // Posición de dibujo (con movimiento horizontal)
    const drawX = b.currentX || b.x;
    const drawY = b.y;
    
    // Efectos visuales sutiles
    if (b.animationState === 'attacking') {
      // Efecto sutil para atacar
      ctx.shadowColor = '#ff6666';
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.95 + 0.05 * Math.sin(b.animTime * 0.01);
    } else {
      // Sin efectos para caminata normal
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    
    // Dibujar el frame actual del spritesheet procesado
    const imageSource = window.processedBearSpritesheet || osoImg;
    ctx.drawImage(
      imageSource,
      sourceX, sourceY, spriteWidth, spriteHeight, // Fuente (frame específico)
      drawX, drawY, b.w, b.h // Destino
    );
    
    // Efecto adicional muy sutil para osos atacando
    if (b.animationState === 'attacking' && b.currentFrame === 2 && Math.random() < 0.2) {
      // Crear muy pocas chispas sutiles
      for (let i = 0; i < 2; i++) {
        const sparkX = drawX + b.w * 0.7 + (Math.random() - 0.5) * 20;
        const sparkY = drawY + b.h * 0.3 + (Math.random() - 0.5) * 20;
        
        ctx.fillStyle = `rgba(255, 200, 100, ${0.3 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  });

  // explosiones
  explosions.forEach(explosion => {
    explosion.particles.forEach(p => {
      ctx.save();
      
      const alpha = p.life;
      ctx.globalAlpha = alpha;
      
      // glow effect
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8 * alpha;
      
      // partícula principal
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      
      // núcleo brillante
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
  });

  // láseres disparados
  lasers.forEach(l => {
    ctx.save();
    
    // efecto de brillo pulsante más intenso
    const intensity = 0.8 + 0.2 * Math.sin(l.glow * 4);
    const glowSize = 25 + 10 * Math.sin(l.glow * 2);
    
    // Halo exterior (más grande y brillante)
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = glowSize;
    ctx.fillStyle = `rgba(0, 255, 255, ${intensity * 0.3})`;
    ctx.fillRect(l.x - 4, l.y, l.w + 8, l.h);
    
    // Láser principal (cian brillante más grande)
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(0, 255, 255, ${intensity})`;
    ctx.fillRect(l.x, l.y, l.w, l.h);
    
    // Núcleo del láser (blanco brillante)
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.9})`;
    ctx.fillRect(l.x + 3, l.y, l.w - 6, l.h);
    
    // Línea central ultra brillante
    ctx.shadowBlur = 5;
    ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
    ctx.fillRect(l.x + 6, l.y, l.w - 12, l.h);
    
    ctx.restore();
  });

  // sable láser verde
  if (player.attacking){
    const s = getSwordRegion();
    ctx.save();
    ctx.shadowColor = "lime";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(0,255,0,0.8)";
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.restore();
  }

  // jugador con animación de caminata
  ctx.save();
  
  // Procesar imagen de Velatron para eliminar fondo (una sola vez)
  if (!window.processedPlayerImage && playerImg.complete) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = playerImg.width;
    tempCanvas.height = playerImg.height;
    
    // Dibujar la imagen original
    tempCtx.drawImage(playerImg, 0, 0);
    
    // Obtener y procesar los píxeles para eliminar fondo
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    // Eliminar fondo blanco/gris claro
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b_val = data[i + 2];
      const brightness = (r + g + b_val) / 3;
      
      // Eliminar píxeles claros (fondo blanco/gris claro)
      if (brightness > 200 || (r > 220 && g > 220 && b_val > 220)) {
        data[i + 3] = 0; // Completamente transparente
      }
      // Reducir opacidad de píxeles gris medio que puedan ser parte del fondo
      else if (brightness > 180 && Math.abs(r - g) < 20 && Math.abs(g - b_val) < 20) {
        data[i + 3] = 0; // También hacer transparente grises uniformes
      }
      // Todo lo demás mantener completamente opaco
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    window.processedPlayerImage = tempCanvas;
  }
  
  // Aplicar offset de caminata
  const drawX = player.x + (player.walkOffsetX || 0);
  const drawY = player.y;
  
  // Usar imagen procesada o original
  const playerImageSource = window.processedPlayerImage || playerImg;
  
  if (player.facing === -1){
    ctx.translate(drawX + player.w/2, drawY);
    ctx.scale(-1,1);
    ctx.drawImage(playerImageSource, -player.w/2, 0, player.w, player.h);
  } else {
    ctx.drawImage(playerImageSource, drawX, drawY, player.w, player.h);
  }
  ctx.restore();
}

/* ---------------- Loop ---------------- */
function loop(now){
  // Solo ejecutar el juego si ha comenzado y no está pausado
  if (!gameStarted || introActive || gamePaused) {
    requestAnimationFrame(loop);
    return;
  }
  
  const dt = now - (lastTime || now);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

/* ---------------- Cambiar nombre de jugador ---------------- */
async function changeName() {
  const currentName = getPlayerName() || 'Anónimo';
  const currentPhoto = getPlayerPhoto();
  let newPhoto = currentPhoto;
  
  const photoPreview = currentPhoto 
    ? `<img src="${currentPhoto}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #00ffff; margin: 10px 0;">` 
    : '<p style="color: #888; margin: 10px 0;">Sin foto</p>';
  
  const { value: name } = await Swal.fire({
    title: '🎮 Editar perfil',
    html: `
      <p style="font-size: 18px; margin: 15px 0;">Nombre actual: <strong>${currentName}</strong></p>
      <div style="margin: 20px 0;">
        <p style="font-size: 16px; margin: 10px 0;">Foto actual:</p>
        ${photoPreview}
        <div style="margin-top: 15px;">
          <input type="file" id="profile-photo-change" accept="image/*" style="display: none;">
          <button onclick="document.getElementById('profile-photo-change').click()" 
                  style="background: linear-gradient(45deg, #00ffff, #0080ff); border: none; border-radius: 10px; 
                         color: #000; font-weight: bold; padding: 10px 20px; cursor: pointer; font-size: 14px; margin: 5px;">
            📸 Cambiar foto
          </button>
          <button onclick="document.getElementById('new-photo-preview').innerHTML = '<p style=\'color: #888;\'>Sin foto</p>'; window.newPhotoData = null;" 
                  style="background: linear-gradient(45deg, #ff4444, #ff8888); border: none; border-radius: 10px; 
                         color: #fff; font-weight: bold; padding: 10px 20px; cursor: pointer; font-size: 14px; margin: 5px;">
            ❌ Eliminar foto
          </button>
        </div>
        <div id="new-photo-preview" style="margin-top: 15px;"></div>
      </div>
    `,
    input: 'text',
    inputValue: currentName === 'Anónimo' ? '' : currentName,
    inputPlaceholder: 'Nuevo nombre',
    inputAttributes: {
      maxlength: 20,
      style: 'font-size: 20px; text-align: center; padding: 15px;'
    },
    showCancelButton: true,
    confirmButtonText: '✅ Guardar',
    cancelButtonText: '❌ Cancelar',
    didOpen: () => {
      const photoInput = document.getElementById('profile-photo-change');
      const preview = document.getElementById('new-photo-preview');
      
      photoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            newPhoto = await handlePhotoUpload(file);
            window.newPhotoData = newPhoto;
            preview.innerHTML = `<img src="${newPhoto}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #00ff00;">`;
          } catch (error) {
            preview.innerHTML = `<p style="color: #ff4444;">${error}</p>`;
          }
        }
      });
    },
    inputValidator: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Debes ingresar un nombre';
      }
    },
    backdrop: 'rgba(0, 0, 0, 0.8)',
    customClass: {
      popup: 'game-over-popup'
    }
  });
  
  if (name && name.trim().length > 0) {
    setPlayerName(name.trim());
    if (window.newPhotoData !== undefined) {
      if (window.newPhotoData === null) {
        localStorage.removeItem('velatronPlayerPhoto');
      } else {
        setPlayerPhoto(window.newPhotoData);
      }
      window.newPhotoData = undefined;
    }
    Swal.fire({
      title: '✅ Perfil actualizado',
      text: `Tu nuevo nombre es: ${name.trim()}`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      backdrop: 'rgba(0, 0, 0, 0.8)'
    });
  }
}