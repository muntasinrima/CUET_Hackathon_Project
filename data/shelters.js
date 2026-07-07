const shelters = [
  {
    id: 1,
    name: "Rajshahi Government College Shelter",
    district: "Rajshahi",
    lat: 24.3745,
    lng: 88.6042,

    capacity: 500,
    occupied: 320,

    food: true,
    medical: true,
    water: true,
    electricity: true,
    wheelchair: true,

    status: "Open"
  },

  {
    id: 2,
    name: "RUET Emergency Shelter",
    district: "Rajshahi",
    lat: 24.3636,
    lng: 88.6241,

    capacity: 800,
    occupied: 710,

    food: true,
    medical: true,
    water: true,
    electricity: true,
    wheelchair: true,

    status: "Open"
  },

  {
    id: 3,
    name: "Rajshahi City Corporation Shelter",
    district: "Rajshahi",
    lat: 24.3658,
    lng: 88.5987,

    capacity: 400,
    occupied: 395,

    food: false,
    medical: true,
    water: true,
    electricity: false,
    wheelchair: false,

    status: "Open"
  }
];

window.shelters = shelters;