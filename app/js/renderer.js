'use strict';

window.$ = window.jQuery = require('jquery');
window.Bootstrap = require('bootstrap');

(function() {
  function hookUpEvents() {
    $('#export-btn').on('click', async () => {
      await storage.list((t) => {
        console.log(`${t.day}#${t.type}#${t.name}#${t.durationSecs}`);
      });
    });

    $('#taskName').on('keyup', (event) => {
      if (event.keyCode == 13) {
        let id = generateUUID();
        let type = $('#taskType').val();
        let name = $('#taskName').val();
        let task = { id: id, type: type, name:name };

        storage.add(task);
        showAlert("Task added!");
        showTask(task);
        $('#taskName').val('');
      }
    });

    $('#clear-btn').on('click', (event) => {
      storage.clear();
      showTasks();
      showAlert("All tasks removed!");
    });

    $('#stop-btn').on('click', (event) => {
      storage.stop();
      showAlert("Timing stopped!");
      $(`.bg-success`).removeClass('bg-success');
    });

    $('#tasks-container').on('click', '.start-button', async (e) => {
      let taskId = $(e.target).attr('data-task-id');
      await storage.start(taskId);
      $(`.bg-success`).removeClass('bg-success');
      $(`#row-${taskId}`).addClass('bg-success');
      showAlert("Starting task!");
    });
  }

  async function showTasks() {
    $('#tasks-container').empty();
    await storage.list((t) => {
      showTask(t);
    });
  }

  function showTask(task) {
    $('#tasks-container').append(`
      <div class="row" id="row-${task.id}">
        <div class="col-md-10">
          <h5>${task.type} - ${task.name} - ${task.duration}</h5>
        </div>
        <div class="col-md-2">
          <button type="button" data-task-id="${task.id}" class="start-button form-control">Start</button>
        </div>
      </div>
      `);
  }

  function showAlert(message) {
    $('#alert-placeholder')
    .html(`
      <div class="alert alert-primary fade show" role="alert">
      ${message}
      </div>
      `
    );
    $('#alert-placeholder')
    .fadeTo(2000, 500).slideUp(500);
  }

  function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  $(document).ready(() => {
    storage.init();
    showTasks();
    hookUpEvents();
    setInterval(async () => {
      await storage.refreshRunning();
      showTasks();
    }, 60000);
  });
} ());
