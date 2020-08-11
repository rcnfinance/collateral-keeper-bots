module.exports.report = (tableName, action, element) => {
  const message = {
    name: '<bot_name>',
    measurement: tableName,
    action,
    data: element,
  };

  send(message);
};

module.exports.reportError = (tableName, element, error) => {
  const message = {
    name: '<bot_name>',
    measurement: tableName,
    data: {
      element,
      error,
    },
  };

  send(message);
};

async function send(message) {
}