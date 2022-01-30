// Create variable to hold db connection
let db;

// Establish a connection to IndexedDB database called 'budget' and set it version 1
const request = indexedDB.open('budget', 1);

// This event will emit if the database version changes
request.onupgradeneeded = function (event) {
  // Save a reference to the database
  const db = event.target.result;
  // Create an object store (table) called 'pending', set it to have an auto incrementing primary key of sorts
  db.createObjectStore('pending', { autoIncrement: true });
};

request.onsuccess = function (event) {
  // When db is successfully created with its object store (from onupgradedneeded event above), save reference to db in global variable
  db = event.target.result;

  // Check if app is online, if yes run uploadTransaction() function to send all local db data to api
  if (navigator.onLine) {
    uploadTransaction();
  }
};

request.onerror = function (event) {
  // Log error here
  console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new transaction and there's no internet connection
function saveRecord(record) {
  // Open a new transaction with the database with read and write permissions
  const transaction = db.transaction(['pending'], 'readwrite');

  // Access the object store for 'pending'
  const budgetObjectStore = transaction.objectStore('pending');

  // Add record to your store with add method
  budgetObjectStore.add(record);
}

function uploadTransaction() {
  // open a transaction on your pending db
  const transaction = db.transaction(['pending'], 'readwrite');

  // access your pending object store
  const budgetObjectStore = transaction.objectStore('pending');

  // get all records from store and set to a variable
  const getAll = budgetObjectStore.getAll();

  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }

          // Open one more transaction
          const transaction = db.transaction(['pending'], 'readwrite');
          // Access the pending object store
          const budgetObjectStore = transaction.objectStore('pending');
          // clear all items in your store
          budgetObjectStore.clear();

          alert('All saved transactions have been submitted!');
        })
        .catch(err => {
          // Set reference to redirect back here
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener('online', uploadTransaction);
