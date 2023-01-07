# Whatsapp ChatBox

Desarrollo de chatBox para Whatsapp desplegado utilizando NodeJS, webhooks, Google Calendar API y WitAI

# Menus

Menú de navegación utilizando plantillas hechas desde Meta Business Suite
![alt text](https://cdn.glitch.global/f2b273e9-857a-477a-b973-25af494136d4/a8a280d0-1499-4b13-9162-124b6878b00c.image.png?v=1673095199213)

# Respuestas

El chatBox desarrollado es capaz de entender las respuestas (intent) utilizando la API de Wit.ai, como en los siguientes ejemplos:

1.  El usuario responde una por una a las preguntas del bot sobre la fecha y hora de la cita, el chatBox es capaz de entender el contexto y asignar la fecha correcta
    ![alt text](https://cdn.glitch.global/f2b273e9-857a-477a-b973-25af494136d4/c7896d16-1abb-425a-a2ca-447b6279351a.image.png?v=1673095909083)
2.  El usuario responde con un día que depende del contexto, en este ejemplo concreto "lunes" puede significar cualquier fecha pero se asume como el lunes más próximo. Además se entiende la hora también, evitando preguntar por esta en las siguientes respuestas del chatBox
    ![alt text](https://cdn.glitch.global/f2b273e9-857a-477a-b973-25af494136d4/aa252f6a-40bb-46b4-94b1-be99554649c7.image.png?v=1673095993660)
3.  El usuario responde con un día concreto, que es asignada según la fecha más próxima. Como no fue definida una hora se envía un mensaje preguntando.
    ![alt text](https://cdn.glitch.global/f2b273e9-857a-477a-b973-25af494136d4/344d4482-bc88-4b60-975b-baf172607bca.image.png?v=1673096184670)

Para todos los ejemplos anteriores las fechas y horarios disponibles son obtenidos desde Google Calendar de un usuario de prueba (en un horario de 8am hasta 5pm) utilizando OAuth2, si se confirma la cita se crea un evento automáticamente en el Calendario y se actualizan los horarios disponibles.
La duración del evento creado depende del servicio solicitado en el chatBox, distintos servicios tienen distinta duración

Existe un _time-out_ en caso de que el usuario comunicandose con el chatBox no emita respuesta. Se envía un advertencia (_warning_) con dos posibilidades: Si hay respuesta se continua el chat con normalidad, sino hay respuesta se termina la conversación. Esto con el objetivo de ahorrar recursos

## Recursos adicionales

Se requiere de un archivo .env con la siguiente estructura:

####

    VERIFY_TOKEN = Webhook callback token
    WHATSAPP_TOKEN = Whatsapp message api token
    GOOGLE_TOKEN = Google developer app token
    GOOGLE_CLIENT_SECRET = Google calendar user client secret (OAuth2)
    REFRESH_TOKEN = Google calendar user refresh token (OAuth2)
    WITAI_SERVER_TOKEN = WitAi app token
