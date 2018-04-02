'use strict';

var storage = (function() {
  let to_human = require('seconds-to-human');
  let sqlite3 = require('sqlite3').verbose();
  let db = new sqlite3.Database('/tmp/tasks');

  db.getAsync = (sql) => {
      return new Promise((resolve, reject) => {
          db.get(sql, (err, row) => {
              if (err)
                  reject(err);
              else
                  resolve(row);
          });
      });
  };

  db.runAsync = (sql) => {
      return new Promise((resolve, reject) => {
          db.run(sql, (err) => {
              if (err)
                  reject(err);
              else
                  resolve();
          });
      })
  };

  async function bootstrapDb() {
      db.runAsync(`CREATE TABLE IF NOT EXISTS tasks(id TEXT, name TEXT, type TEXT, running INTEGER, lut INTEGER, duration INTEGER, day TEXT);`);
  };

  async function clearTasks() {
    db.runAsync(`DELETE from tasks;`);
  }

  async function addTask(task) {
    var today = todayAsString();
    db.runAsync(`INSERT INTO tasks VALUES('${task.id}', '${task.name}', '${task.type}', 0, 0, 0, '${today}');`);
  }

  async function listTasks(fn) {
    await forEachTask((row) => {
      row.durationSecs = row.duration;
      row.duration = to_human(row.duration);
      if (row.duration instanceof Error) {
        row.duration = "0 seconds";
      }
      fn(row);
    });
  }

  async function exportTasks() {
    await forEachTask((row) => {
      console.log("%s#%s#%s#%s#%s", row.day, row.id, row.type, row.name, row.duration);
    });
  }

  async function forEachTask(rowCallback) {
    db.each("SELECT * from tasks", (err, row) => {
      if (err) {
        return console.log(err.message);
      }
      rowCallback(row);
    });
  }

  function todayAsString() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();

    if (dd<10) {
      dd = '0'+dd
    }

    if (mm<10) {
      mm = '0'+mm
    }

    return dd + '/' + mm + '/' + yyyy;
  }

  async function startTask(taskId) {
    var runningTask = await db.getAsync(`SELECT * from tasks WHERE running=1`);
    if (taskId && runningTask && taskId == runningTask.id) {
      return;
    }
    stopRunningTask(runningTask);

    let lut = nowInSecs();
    db.runAsync(`UPDATE tasks SET running=1, lut=${lut} WHERE id='${taskId}'`);
  }

  async function stopRunningTask(runningTask) {
    if (!runningTask) {
      runningTask = await db.getAsync(`SELECT * from tasks WHERE running=1`);
    }

    if (runningTask) {
      let lut = nowInSecs();
      let duration = runningTask.duration + (lut - runningTask.lut);
      db.runAsync(`UPDATE tasks SET running=0, duration=${duration}, lut=${lut} WHERE id='${runningTask.id}'`);
    }
  }

  async function refeshRunningTask() {
    let runningTask = await db.getAsync(`SELECT * from tasks WHERE running=1`);

    if (runningTask) {
      let lut = nowInSecs();
      let duration = runningTask.duration + (lut - runningTask.lut);
      db.runAsync(`UPDATE tasks SET duration=${duration}, lut=${lut} WHERE id='${runningTask.id}'`);
    }
  }

  function nowInSecs() {
    return Math.floor(new Date().getTime() / 1000);
  }

  return {
    init: async () => await bootstrapDb(),
    clear: async () => await clearTasks(),
    add: async (task) => await addTask(task),
    list: async (fn) => await listTasks(fn),
    export: async () => await exportTasks(),
    start: async (taskId) => await startTask(taskId),
    stop: async () => await stopRunningTask(),
    refreshRunning: async () => await refeshRunningTask()
  };
} ());
