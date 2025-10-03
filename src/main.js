// Frontend logic: login, store token in localStorage as `sessionToken`, call protected endpoint

const selectors = {
  btnLogin: document.getElementById('btn-login'),
  btnLogout: document.getElementById('btn-logout'),
  authStatus: document.getElementById('auth-status'),
  tokenInfo: document.getElementById('token-info'),
  btnSearch: document.getElementById('btn-search'),
  pokemonInput: document.getElementById('pokemon-input'),
  message: document.getElementById('message'),
  resultCard: document.getElementById('result'),
  pokeImg: document.getElementById('poke-img'),
  pokeName: document.getElementById('poke-name'),
  pokeSpecies: document.getElementById('poke-species'),
  pokeWeight: document.getElementById('poke-weight')
};

const API_BASE = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL ? window.APP_CONFIG.API_BASE_URL : '';

function setAuthState(isAuthed){
  selectors.authStatus.textContent = isAuthed ? 'Autenticado' : 'No autenticado';
  if(isAuthed){
    selectors.btnLogout.classList.remove('hidden');
    selectors.btnLogin.classList.add('hidden');
    selectors.btnSearch.classList.remove('disabled');
  } else {
    selectors.btnLogout.classList.add('hidden');
    selectors.btnLogin.classList.remove('hidden');
    selectors.btnSearch.classList.add('disabled');
    selectors.tokenInfo.textContent = '';
  }
}

async function login(){
  selectors.message.textContent = '';
  try{
    const res = await fetch(`${API_BASE}/api/v1/auth`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email: 'admin@admin.com', password: 'admin'})
    });

    if(res.status === 200){
      const data = await res.json();
      if(data.token){
        localStorage.setItem('sessionToken', data.token);
        setAuthState(true);
        selectors.message.textContent = 'Login exitoso. Token guardado en localStorage.';
        showTokenInfo(data.token);
      } else {
        selectors.message.textContent = 'Respuesta inesperada del servidor.';
      }
    } else {
      const err = await res.json().catch(()=>({}));
      selectors.message.textContent = err.error || 'Login fallido';
      setAuthState(false);
    }
  } catch(e){
    selectors.message.textContent = 'Error de red al comunicarse con el backend.';
  }
}

function logout(){
  localStorage.removeItem('sessionToken');
  setAuthState(false);
  selectors.message.textContent = 'Sesión cerrada.';
}

function parseJwt(jwt){
  try{
    const parts = jwt.split('.');
    if(parts.length!==3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  }catch(e){return null}
}

function showTokenInfo(token){
  const payload = parseJwt(token);
  if(!payload) { selectors.tokenInfo.textContent = 'Token presente (no decodificable)'; return }
  const exp = payload.exp;
  if(!exp){ selectors.tokenInfo.textContent = 'Token presente'; return }
  const expMs = exp * 1000;
  const now = Date.now();
  const diff = expMs - now;
  if(diff<=0){
    selectors.tokenInfo.textContent = 'Token expirado';
    setAuthState(false);
  } else {
    const minutes = Math.floor(diff/60000);
    selectors.tokenInfo.textContent = `Token expira en ~${minutes} minuto(s)`;
  }
}

async function searchPokemon(){
  selectors.message.textContent = '';
  selectors.resultCard.classList.add('hidden');

  const name = selectors.pokemonInput.value.trim().toLowerCase();
  if(!name){selectors.message.textContent = 'Ingresa el nombre de un Pokémon';return}

  const token = localStorage.getItem('sessionToken');
  if(!token){
    selectors.message.textContent = 'Debes iniciar sesión primero.';
    setAuthState(false);
    return;
  }

  try{
    const res = await fetch(`${API_BASE}/api/v1/pokemonDetails`, {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({pokemonName: name})
    });

    if(res.status === 200){
      const data = await res.json();
      // expected fields: name, species, weight, img_url
      selectors.pokeImg.src = data.img_url || '';
      selectors.pokeImg.alt = data.name || '';
      selectors.pokeName.textContent = data.name || '';
      selectors.pokeSpecies.textContent = data.species || '';
      selectors.pokeWeight.textContent = data.weight || '';
      selectors.resultCard.classList.remove('hidden');
      selectors.message.textContent = '';
    } else if(res.status === 400){
      // pokemon no encontrado -> mostrar mensaje y limpiar tarjeta
      selectors.pokeImg.src = '';
      selectors.pokeImg.alt = '';
      selectors.pokeName.textContent = '';
      selectors.pokeSpecies.textContent = '';
      selectors.pokeWeight.textContent = '';
      selectors.resultCard.classList.add('hidden');
      selectors.message.textContent = 'Ups! Pokémon no encontrado';
    } else if(res.status === 403){
      selectors.message.textContent = 'User not authenticated';
      setAuthState(false);
    } else {
      const e = await res.json().catch(()=>({}));
      selectors.message.textContent = e.error || ('Error en la petición: ' + res.status);
    }
  }catch(e){
    selectors.message.textContent = 'Error de red al comunicarse con el backend.';
  }
}

selectors.btnLogin.addEventListener('click', ()=>{
  login();
});

selectors.btnLogout.addEventListener('click', ()=>{
  logout();
});

selectors.btnSearch.addEventListener('click', ()=>{
  searchPokemon();
});

// Initialize UI
const existingToken = localStorage.getItem('sessionToken');
setAuthState(!!existingToken);
if(existingToken) showTokenInfo(existingToken);
