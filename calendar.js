const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
// const { oAuth2 } = ;

const client = new OAuth2Client(
  process.env.GOOGLE_TOKEN,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://somber-wiggly-nymphea.glitch.me"
);
client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

async function setEvent(eventStartTime_string, service, summary, description, duration_m) {
  const calendar = google.calendar({ version: "v3", auth: client });

  const eventStartTime = new Date(eventStartTime_string);
  eventStartTime.setDate(eventStartTime.getDate());
  eventStartTime.setHours(eventStartTime.getHours());

  const eventEndTime = new Date(eventStartTime_string);
  eventEndTime.setDate(eventEndTime.getDate());
  eventEndTime.setHours(eventEndTime.getHours());
  eventEndTime.setMinutes(eventEndTime.getMinutes() + (60 * duration_m));

  const event = {
    summary: summary,
    location: "Consultorio Oral-Concept",
    description: description,
    start: {
      dateTime: eventStartTime,
      timeZone: "America/Bogota",
    },
    end: {
      dateTime: eventEndTime,
      timeZone: "America/Bogota",
    },
    colorId: 4,
  };

  const result = await calendar.freebusy.query({
    resource: {
      timeMin: eventStartTime,
      timeMax: eventEndTime,
      timeZone: "America/Bogota",
      items: [{ id: service }],
    },
  });
  const eventsArr = result.data.calendars[service].busy;
  // console.log(eventsArr);
  if (eventsArr.length == 0) {
    calendar.events.insert({ calendarId: service, resource: event }, (err) => {
      if (err) return console.error("Error", err);
      // return console.log("Funciona pa");
    });
  }
}

async function checkCalendar(service, day, duration_m) {
  const calendar = google.calendar({ version: "v3", auth: client });

  const eventStartTime = new Date(day);
  eventStartTime.setDate(eventStartTime.getDate());
  eventStartTime.setHours(7 + 5);
  eventStartTime.setMinutes(0);
  eventStartTime.setSeconds(0);
  const eventEndTime = new Date(day);
  eventEndTime.setDate(eventEndTime.getDate());
  eventEndTime.setHours(17 + 5);
  eventEndTime.setMinutes(0);
  eventEndTime.setSeconds(0);
  var result = [];

  // console.log("Fecha de inicio " + eventStartTime);
  // console.log("Fecha de final " + eventEndTime);
  var response = await calendar.freebusy.query({
    resource: {
      timeMin: eventStartTime,
      timeMax: eventEndTime,
      timeZone: "America/Bogota",
      items: [{ id: service }],
    },
  });
  const eventsArr = response.data.calendars[service].busy;
  if (eventsArr.length == 0) {
    result = [{ start: eventStartTime, end: eventEndTime }];
  } else {
    result = findEmptyHours(eventsArr, {
      start: eventStartTime,
      end: eventEndTime,
    }, duration_m);
  }
  return result;
}

async function checkAvailability(eventStartTime_string, service, duration_m){
  const calendar = google.calendar({ version: "v3", auth: client });

  const eventStartTime = new Date(eventStartTime_string);
  eventStartTime.setDate(eventStartTime.getDate());
  eventStartTime.setHours(eventStartTime.getHours());

  const eventEndTime = new Date(eventStartTime_string);
  eventEndTime.setDate(eventEndTime.getDate());
  eventEndTime.setHours(eventEndTime.getHours());
  eventEndTime.setMinutes(eventEndTime.getMinutes() + (60 * duration_m));
  
  if (eventStartTime.getHours() < 12 || eventStartTime.getHours() > 22) {      //AÑADIDO EL REVISADO DE LA HORA
    //console.log("Fuera de rango, " + eventStartTime);
    return false;
  }
  
  let vArray = await checkCalendar(service, eventStartTime, duration_m);          //AÑADIDO EL REVISADO DE DISPONIBILIDAD DEL DÍA
  if (vArray.length == 0) {
    //console.log("Sin disponibilidad");
    return false;
  }
  
  const result = await calendar.freebusy.query({
    resource: {
      timeMin: eventStartTime,
      timeMax: eventEndTime,
      timeZone: "America/Bogota",
      items: [{ id: service }],
    },
  });
  const eventsArr = result.data.calendars[service].busy;
  // console.log(eventsArr);
  if (eventsArr.length == 0) {
    return true;
    }else{
    return false;
  }
}

function findEmptyHours(events, scope, duration_m) {
  events.unshift({ start: scope.start, end: scope.start });
  events.push({ start: scope.end, end: scope.end });
  var emptySpaces = [];
  events.forEach((event, index) => {
    try {
      const mindate = new Date(event.end);
      const maxdate = new Date(events[index + 1].start);
      let seconds = (maxdate - mindate) / 1000;
      let hours = seconds / 3600;
      //console.log("Horas vacias: "+ hours);
      if (hours >= 1*duration_m) {
        emptySpaces.push({ start: mindate, end: maxdate });
        //console.log(emptySpaces);
      }
    } catch (e) {}
  });
  return emptySpaces;
}



module.exports = { setEvent, checkCalendar, checkAvailability };
