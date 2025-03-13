const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  const message = req.body;
  console.log('Mensaje recibido: ', message);
  // Aquí puedes agregar el procesamiento para guardar el mensaje en tu base de datos o hacer lo que necesites

  res.status(200).send('Mensaje recibido');
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});

