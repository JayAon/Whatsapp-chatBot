/*
 * Starter Project for WhatsApp Echo Bot Tutorial
 *
 * Remix this as the starting point for following the WhatsApp Echo Bot tutorial
 *
 */

/* Cosas por hacer

- actualizar la plantilla del menu principal para dar la opción de hablar con una persona (asistencia humana)
- añadir el caso para la asistencia humana

*/

"use strict";

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
const token = process.env.WHATSAPP_TOKEN;

// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json()), // creates express http server
  fs = require("fs"),
  calendar = require("./calendar.js"),
  nli = require("./nli.js");

const keywords = require("./json/keywords.json"),
  main_menu = require("./json/main_menu.json"),
  sessions = require("./json/sessions.json"),
  services_menu = require("./json/services_menu.json"),
  team_menu = require("./json/team_template.json"),
  datewords = require("./json/datewords.json"),
  serviceswords = require("./json/serviceswords.json"),
  timewords = require("./json/timewords.json"),
  app_menu = require("./json/appointment_menu.json");

var interval = setInterval(checkTimer, 1000);
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

app.get("/calendarCheck", async function (req, res) {});

// Accepts POST requests at /webhook endpoint
app.post("/webhook", async function (req, res) {
  // Parse the request body from the POSTt
  let body = await req.body;

  // Check the Incoming webhook message
  // console.log(JSON.stringify(req.body, null, 2));

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object && res.statusCode.toString() === "200") {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      var send = true;
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
      let msg_body;
      try {
        msg_body = req.body.entry[0].changes[0].value.messages[0].text.body;
        // console.log("Movida de texto"); // extract the message text from the webhook payload
      } catch (e) {
        //console.log("Movida de quick");
        //console.log(req.body);
        msg_body = req.body.entry[0].changes[0].value.messages[0].button.text; // extract the message text from the webhook payload
      }
      const words = msg_body.toLowerCase().split(" ");
      var data = {
        messaging_product: "whatsapp",
        to: from,
        text: { body: "" },
      };
      var [sState, sessionIndex] = getSessionState(from);
      if (!interval) {
        interval = setInterval(checkTimer, 60000);
      }
      if (sState) {
        sessions[sessionIndex].warning = false;
        sessions[sessionIndex].lastMsgTime =
          req.body.entry[0].changes[0].value.messages[0].timestamp * 1000;
        if (sessions[sessionIndex].menuLvl == 0) {
          const key = getKey(words, keywords);
          switch (key) {
            case "step_1": //REVISAR LA AGENDA DE CITAS
              data.text.body = "¿Cuál es tu nombre?";
              sessions[sessionIndex].menuLvl = 1;
              break;
            case "step_2":
              data = services_menu;
              data.to = from;
              break;
            case "step_3": //**PLANTILLA
              data = team_menu;
              data.to = from;
              break;
            case "step_4":
              removeFromSessions(sessionIndex);
              data.text.body =
                "Fue un placer servirte, vuelve a comunicarte con chatBox cuando lo necesites";
              break;
            case "step_5":
              data = main_menu;
              data.to = from;
              break;
            case "step_6":
              data.text.body = [
                "Un asistente se comunicará contigo pronto",
              ].join("");
              data.to = from;
              sessions[sessionIndex].menuLvl = 6;
              break;
            default:
              data.text.body =
                "Lo siento, no he podido entender tu solicitud. Aún estoy aprendiendo";
              break;
          }
        } else {
          switch (sessions[sessionIndex].menuLvl) {
            case 1:
              sessions[sessionIndex].name = msg_body;
              sessions[sessionIndex].menuLvl = 2;
              data.text.body = "¿En que servicio estás interesad@?";
              await sendMessage(phone_number_id, data);
              data.text.body = [
                "*Puedes agendar una cita para los siguientes servicios 🤩💙:* \n\n",
                "1. ```Valoración general``` \n",
                "2. ```Valoración para tratamientos estéticos``` \n",
                "3. ```Limpieza```\n",
                "4. ```Blanqueamiento LED```\n",
                "5. ```Mantenimiento de microdiseño```\n",
                "6. ```Mantenimiento de diseño superior```\n",
                "7. ```Mantenimiento completo de diseño```\n",
                "8. ```Reparación de 1 carilla```\n",
                "9. ```Reparación de 2 carillas```\n",
                "10. ```Reparación de 1 borde```\n",
                "11. ```Reparación de 2 bordes```\n\n",
                "_Si es tu primera vez, envía un *1* para agendar una cita de valoración general_\n",
              ].join("");
              break;
            case 2:
              const selected_service = setService(msg_body);
              // console.log(selected_service[0]);
              if (selected_service[0] === "?") {
                data.text.body =
                  "Lo siento, no he podido entender el servicio que solicitas. Aun estoy aprendiendo";
              } else {
                sessions[sessionIndex].service = selected_service[0];
                sessions[sessionIndex].service_text = selected_service[1];
                sessions[sessionIndex].service_duration = selected_service[2];
                sessions[sessionIndex].menuLvl = 3;
                data.text.body = [
                  "¿Para que día quieres la cita?. \n",
                  "Puedes enviar las siguientes palabras:\n",
                  "_Mañana_, _Pasado mañana_, _El lunes_, etc \n",
                ].join("");
              }

              break;
            case 3:
              const nli_response = await nli.checkMsgData(msg_body);
              const appDate = nli.standardDate(nli_response);
              sessions[sessionIndex].appointmentDay = appDate;
              //const appDate = setAppointmentDate(msg_body); //reemplazar con el nli para el mensaje y obtener el objeto de fecha
              //comparar el objeto de fecha obtenido para decidir la funcion a llamar
              try {
                const nArray = await calendar.checkCalendar(
                  sessions[sessionIndex].service,
                  sessions[sessionIndex].appointmentDay,
                  parseFloat(sessions[sessionIndex].service_duration)
                );
                // console.log(nArray);

                if (nArray.length == 0) {
                  data.text.body = [
                    "Lo sentimos, no tenemos disponibilidad para este día \n",
                    "Por favor, escoge otra fecha \n",
                  ].join("");
                  await sendMessage(phone_number_id, data);
                  data.text.body = [
                    "¿Para que día quieres la cita?. \n",
                    "Si no sabes la fecha puedes probar con las siguientes palabras:\n",
                    "_Mañana_, _Pasado mañana_, _el lunes_, etc \n",
                  ].join("");
                } else {
                  if (appDate.getHours() - 5 == 0) {
                    // Si se cumple, significa que no se especificó la hora.
                    let emptySpaces_string = formatSpaces(nArray);
                    data.text.body = [
                      "Tenemos la siguiente disponibilidad de horario: \n",
                      emptySpaces_string.join(""),
                      "\n",
                      "¿Qué hora te queda bien?",
                    ].join("");
                    sessions[sessionIndex].menuLvl = 4;
                  } else {
                    //En este caso, se especificó la hora
                    let available = await calendar.checkAvailability(
                      sessions[sessionIndex].appointmentDay,
                      sessions[sessionIndex].service,
                      parseFloat(sessions[sessionIndex].service_duration)
                    );
                    if (available) {
                      //Mensaje de confirmacion (falta pasar de nivel para esperar respuesta, se puede usar el keywords.json step_4 o step_5 )
                      // O nli para obtener la confirmación
                      data.text.body = [
                        "¿Quieres confirmar una cita de: \n",
                        sessions[sessionIndex].service_text,
                        "para el: \n",
                        "Día:",
                        new Date(
                          sessions[sessionIndex].appointmentDay
                        ).toLocaleDateString("es-CO", {
                          timeZone: "America/Bogota",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }),
                        "a las",
                        new Date(
                          sessions[sessionIndex].appointmentDay
                        ).toLocaleTimeString("es-CO", {
                          timeZone: "America/Bogota",
                        }),
                        "?\n",
                        "Envía _Si_ para confirmar o _No_ para cancelar",
                      ].join(" ");
                      sessions[sessionIndex].menuLvl = 5;
                    } else {
                      //                     Mensaje con horas disponibles para el día
                      let emptySpaces_string = formatSpaces(nArray);
                      const msgNoAva = [
                        "Lo sentimos, para el día",
                        new Date(
                          sessions[sessionIndex].appointmentDay
                        ).toLocaleDateString("es-CO", {
                          timeZone: "America/Bogota",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }),
                        "no tenemos disponibilidad durante la hora que seleccionaste \n",
                        "Escribe _Cancelar_ para regresar al menú principal. \n",
                        "O escoge una hora de las que tenemos disponibles",
                      ].join(" ");
                      data.text.body = msgNoAva;
                      await sendMessage(phone_number_id, data);
                      data.text.body = [
                        "Tenemos la siguiente disponibilidad de horario: \n",
                        emptySpaces_string.join(""),
                        "\n",
                        "¿Qué hora te queda bien?",
                      ].join("");
                      sessions[sessionIndex].menuLvl = 4;
                    }
                  }
                }
              } catch (e) {
                data.text.body =
                  "Lo siento, no he podido entender el día que solicitas. Intenta con otro mensaje";
              }

              break;
            case 4: //**DEFINIR SIGUIENTE PASO
              if (msg_body.toLowerCase() === "cancelar") {
                //se envía el menu inicial
                data.text.body =
                  "Fue un placer servirte, vuelve a comunicarte con chatBox cuando lo necesites";
                removeFromSessions(sessionIndex);
                break;
              }
              try {
                var mensaje = await setAppointTime(
                  msg_body,
                  new Date(sessions[sessionIndex].appointmentDay)
                );
                // console.log("Fechita con horita que funciona " + mensaje);
                sessions[sessionIndex].appointmentDay = mensaje;

                let available = await calendar.checkAvailability(
                  sessions[sessionIndex].appointmentDay,
                  sessions[sessionIndex].service,
                  parseFloat(sessions[sessionIndex].service_duration)
                );
                if (available) {
                  // console.log("esto está funcionando");
                  //Añadir resumen del mensaje
                  data.text.body = [
                    "¿Quieres confirmar una cita de: \n",
                    sessions[sessionIndex].service_text,
                    "para el: \n",
                    "Día:",
                    new Date(
                      sessions[sessionIndex].appointmentDay
                    ).toLocaleDateString("es-CO", {
                      timeZone: "America/Bogota",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }),
                    "a las",
                    new Date(
                      sessions[sessionIndex].appointmentDay
                    ).toLocaleTimeString("es-CO", {
                      timeZone: "America/Bogota",
                    }),
                    "?\n",
                    "Envía _Si_ para confirmar o _No_ para cancelar",
                  ].join(" ");
                  sessions[sessionIndex].menuLvl = 5;
                } else {
                  const msgNoAva = [
                    "Lo sentimos, para el día",
                    new Date(
                      sessions[sessionIndex].appointmentDay
                    ).toLocaleDateString("es-CO", {
                      timeZone: "America/Bogota",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }),
                    "no tenemos disponibilidad durante la hora que seleccionaste \n",
                    "Escribe _Cancelar_ para regresar al menú principal.\n",
                    "O escoge una hora de las que tenemos disponibles",
                  ].join(" ");
                  data.text.body = msgNoAva;
                }
              } catch (e) {
                data.text.body =
                  "Lo siento, no he entendido la hora que deseas. Intenta con otra frase.";
              }
              break;
            case 5: //lvl de confirmación de cita
              const response = msg_body.toLowerCase();
              switch (response) {
                case "si":
                  const summary_string =
                    "Cita de " +
                    sessions[sessionIndex].service_text +
                    " para: " +
                    sessions[sessionIndex].name;
                  const description_string = [
                    "Datos de ",
                    sessions[sessionIndex].name,
                    ":\n",
                    "Número de contacto: ",
                    sessions[sessionIndex].id,
                    "\n",
                    "Servicio solicitado: ",
                    sessions[sessionIndex].service_text,
                    "\n",
                    "Escribir a: ",
                    "https://wa.me/" + sessions[sessionIndex].id,
                  ].join("");
                  calendar.setEvent(
                    sessions[sessionIndex].appointmentDay,
                    sessions[sessionIndex].service,
                    summary_string,
                    description_string,
                    parseFloat(sessions[sessionIndex].service_duration)
                  );
                  sessions[sessionIndex].menuLvl = 0;
                  data.text.body = [
                    "Muchas gracias por confiar en nosotros, te estaremos llamando para confirmar el día y hora de la cita. ¿Podemos ayudar en algo más? \n",
                    "(_Responde si, para realizar otra solicitud o no, para terminar la conversación_)",
                  ].join("");
                  break;
                case "no":
                  data.text.body = [
                    "Sentimos que no quieras apartar la cita, estamos aquí para ayudarte.\n",
                    "¿Podemos ayudar en algo más? \n",
                    "Responde _Si_ para realizar otra solicitud o _No_ para terminar la conversación.",
                  ].join("");
                  //                   dijo que no la leita
                  // mensaje: Listo, NO programamos la cita; Y se envía el menú inicial
                  sessions[sessionIndex].menuLvl = 0;
                  break;
                default:
                  data.text.body =
                    "Lo siento, no he podido entender el servicio que solicitas. Aun estoy aprendiendo";
                  //console.log("Invalido");
              }
              break;
            case 6:
              //               Se añade la opción para el setInterval
              send = false;
              break;
            default:
              break;
          }
        }

        // console.log(getTimeDiff(parseInt("1661571891000") > 300));
      } else {
        try {
          let session = {
            id: from.toString(),
            menuLvl: 0,
            name: "",
            service: "",
            service_text: "",
            service_duration: "",
            phone_number_id: phone_number_id,
            warning: false,
            appointmentDay: "",
            lastMsgTime:
              req.body.entry[0].changes[0].value.messages[0].timestamp * 1000,
          };
          sessions.push(session);
          data = main_menu;
          data.to = from;
        } catch (e) {
          console.log(e);
        }
      }

      if (send) {
        sendMessage(phone_number_id, data);
      }

      //       DEFINIR EL MANEJO DEL TIMEOUT
      //       EL GUARDADO DE LA INFORMACIÓN DE LAS CITAS AGENDADAS
    }
    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
   **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

function getKey(words, array) {
  var key = "";
  words.forEach((word) => {
    if (key === "") {
      var foundWord = [];
      for (const step of array) {
        foundWord = step.keywords.find((key) => key === word);
        try {
          if (foundWord.length > 0) {
            key = step.key;
            break;
          }
        } catch (e) {}
      }
    }
  });
  return key;
}

function getSessionState(id) {
  var state = false;
  var sessionIndex;
  sessions.forEach((session, index) => {
    if (session.id === id.toString()) {
      state = !state;
      sessionIndex = index;
    }
  });
  return [state, sessionIndex];
}

function getTimeDiff(initialTime) {
  const initDate = new Date(initialTime);
  const finalDate = new Date();
  const timeDiff = (finalDate.getTime() - initDate.getTime()) / 1000;
  return timeDiff;
}

async function sendMessage(phone_number_id, data) {
  const res = await axios({
    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
    url:
      "https://graph.facebook.com/v12.0/" +
      phone_number_id +
      "/messages?access_token=" +
      token,
    data: data,
    headers: { "Content-Type": "application/json" },
  });
}

function removeFromSessions(sessionIndex) {
  sessions.splice(sessionIndex, 1);
}
function setService(msg) {
  var service_string = "";
  var service_text_string = "";
  var duration = 1;
  const key = getKey(msg.toLowerCase().split(" "), serviceswords);
  switch (key) {
    case "v_general":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Valoración general";
      duration = 0.5;
      break;
    case "v_esteticos":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Valoración para tratamientos estéticos";
      duration = 0.5;
      break;
    case "limpieza":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Limpieza";
      duration = 1;
      break;
    case "blanq":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Sesión de blanqueamiento";
      duration = 0.5;
      break;
    case "microdiseno":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Mantenimiento de microdiseño";
      duration = 0.5;
      break;
    case "m_sup":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Mantenimiento de diseño superior";
      duration = 1;
      break;
    case "m_comp":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Mantenimiento completo de diseño";
      duration = 1;
      break;
    case "r_carilla":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Reparación de 1 carilla";
      duration = 0.75;
      break;
    case "r_carillas":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Reparación de 2 carillas";
      duration = 1.5;
      break;
    case "r_borde":
      service_string = "odontologiaoralconcept@gmail.com";
      service_text_string = "Reparación de 1 borde";
      duration = 0.5;
      break;
    case "r_bordes":
      service_string = "n3vmd5db4isrst6srgc45aevdc@group.calendar.google.com";
      service_text_string = "Reparación de 2 bordes";
      duration = 1;
      break;
    default:
      service_string = "?";
      break;
  }
  return [service_string, service_text_string, duration];
}

//Funcion de prueba para estandarizar el formato de las horas, busca en el string y reemplaza (am/pm) según las keywords
async function setAppointTime(msg, appDate) {
  const nli_response = await nli.checkMsgData(msg);
  const appTime = nli.standardDate(nli_response);
  appDate.setHours(appTime.getHours());
  appDate.setMinutes(appTime.getMinutes());
  appDate.setSeconds(appTime.getSeconds());
  if (appTime.getHours() < 5) {
    appDate.setHours(appTime.getHours() + 5);
  }
  // console.log("Fechita con horita: " + appDate);
  return appDate.toISOString();
}

function formatSpaces(array) {
  var emptySpaces_string = [];
  array.forEach((space) => {
    emptySpaces_string.push(
      "De " +
        space.start.toLocaleTimeString("en-US", {
          timeZone: "America/Bogota",
        }) +
        " a " +
        space.end.toLocaleTimeString("en-US", {
          timeZone: "America/Bogota",
        }) +
        "\n"
    );
  });
  return emptySpaces_string;
}

function checkTimer(maxTimeOut) {
  if (sessions.length == 0) {
    clearInterval(interval);
    interval = null;
  }
  var data = {
    messaging_product: "whatsapp",
    to: "",
    text: { body: "" },
  };
  sessions.forEach(async (user, index) => {
    const last_time = new Date() - new Date(user.lastMsgTime);
    if (user.menuLvl == 6) {
      if (last_time >= 600000) {
        data.to = user.id;
        data.text.body = [
          "Fue un placer atenderte \n",
          "Comunícate con nosotros cuando lo necesites",
        ].join("");
        await sendMessage(user.phone_number_id, data);
        removeFromSessions(index);
      }
    } else {
      if (last_time > 150000 && !user.warning) {
        user.warning = true;
        data.to = user.id;
        data.text.body = [
          "Hola, ¿sigues ahí? \n",
          "Tenemos un rato sin saber de ti \n",
          "Puedes retomar la conversación desde donde la dejaste",
        ].join("");
        await sendMessage(user.phone_number_id, data);
      }
      if (last_time >= 300000) {
        data.to = user.id;
        data.text.body = [
          "Fue un placer atenderte \n",
          "Comunícate con nosotros cuando lo necesites",
        ].join("");
        await sendMessage(user.phone_number_id, data);
        removeFromSessions(index);
      }
    }
  });
}
