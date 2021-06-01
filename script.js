'use strict';


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(distance, duration, coords){
        this.distance = distance; // in km
        this.duration = duration; //in min
        this.coords = coords; //[lat, lng]
    }

    _setDiscription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;  
        //return this.description;
    }
}

class Running extends Workout{
    type = 'running'

    constructor(distance, duration, coords, cadence){
        super(distance, duration, coords);
        this.cadence = cadence;
        this.calcPace();
        this._setDiscription();
    }

    calcPace(){
        this.pace = this.duration / this.distance; //min/km
        //return this.pace
    }
}

class Cycling extends Workout{
    type = 'cycling'

    constructor(distance, duration, coords, elevationGain){
        super(distance, duration, coords);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDiscription();
    }

    calcSpeed(){
        this.speed = this.distance / this.duration; //min/km
        //return this.speed
    }
}

class App{
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 10 ;

    constructor(){
        this._getPosition();
        // Get data from local storage
        this._getLocalStorage();
        // Attach event handlers
        inputType.addEventListener('change', this._toggleElevationField);
        form.addEventListener('submit', this._newWorkout.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    }

    _getPosition(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                function(){ alert('Could not acess your position') }
            )
        }    
    }

    _loadMap(position){
        //console.log(position)
        const latitude = position.coords.latitude;
        const {longitude} = position.coords;
        //console.log(`https://www.google.co.in/maps/@${latitude},${longitude}`)
        const coords = [latitude, longitude];        
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(mapE){
        this.#mapEvent = mapE; 
        form.classList.remove('hidden')
        inputDistance.focus();
    }

    _hideForm(){
      inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
  
      form.style.display = 'none';
      form.classList.add('hidden');
      setTimeout(() => (form.style.display = 'grid'), 1000);
    }

    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e){

        const validInputs = (...inputs) => inputs.every( inp => Number.isFinite(inp) );
        const allPositive = (...inputs) => inputs.every( inp => inp > 0 );
        
        e.preventDefault();

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        if(type === 'running'){
            const cadence = +inputCadence.value;

            if( !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                return alert('Please enter valid values');
            }

            workout = new Running(distance, duration, [lat, lng], cadence);
        }
        
        if(type === 'cycling'){
            const elevationGain = +inputElevation.value;

            if(!validInputs(distance, duration, elevationGain) || !allPositive(distance, duration)) {
                return alert('Please enter a valid inputs');
            }

            workout = new Cycling(distance, duration, [lat, lng], elevationGain);
        }

        this.#workouts.push(workout);
        
        // Render workout on map as marker
        this._renderWorkoutMarker(workout)

        //// Render workout on list
        this._renderWorkoutList(workout)

        this._hideForm()

        // Set local storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkoutList(workout){
        let html;

        html = 
         `<li class="workout workout--${workout.type}" data-id="${workout.id}">
            
            <div class="workout__head">
                <h2 class="workout__title">${workout.description}</h2>
                
                <svg class="delete__icon" >
                    <use xlink:href = "img/sprite.svg#icon-bin"></use>
                </svg>
                
            </div>
            <div class="workout__details">
                <span class="workout__icon">${
                    workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                }</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>`
        ;        
        
        if (workout.type === 'running')
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
          </li>
        `;

        if (workout.type === 'cycling')
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
        `;

        form.insertAdjacentHTML('afterend', html);
    }

    _renderWorkoutMarker(workout){
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
            L.popup({
                maxWith: 250,
                minWidth: 100,
                autoclose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            })
        )
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️' } ${workout.description}`)
        .openPopup();
    }

    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout');
        if(!workoutEl) return;
        if(e.target.classList.contains('delete__icon')) return;

        const workoutPopup = this.#workouts.find( work => work.id === workoutEl.dataset.id)
        //console.log('popup')

        this.#map.setView(workoutPopup.coords, this.#mapZoomLevel, {
            animate: true,
            pan: { duration: 1 }
        });       
    }

    _deleteWorkout(e){
        
        const bin = e.target;
        const workoutDelete = bin.closest('.delete__icon');
            
        if(!workoutDelete) return;

        const workoutDeleteEl = bin.closest('.workout');
        const workoutDelIndex = this.#workouts.findIndex(work => work.id === workoutDeleteEl.dataset.id)
        //console.log('del')

        workoutDeleteEl.style.display = 'none';
        this.#workouts.splice(workoutDelIndex, 1);  

        this._setLocalStorage();
        location.reload();
    }
    
    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }
    
    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
    
        if (!data) return;
    
        this.#workouts = data;
    
        this.#workouts.forEach(work => {
          this._renderWorkoutList(work);
        });
    }
}

const app = new App(1234);
