require('dotenv').config();
const axios = require('axios');
const colors = require('colors');

class Spinner {
  constructor() {
    this.frames = ['-', '\\', '|', '/'];
    this.interval = 10;
    this.intervalId = null;
    this.currentIndex = 0;
  }

  start() {
    this.intervalId = setInterval(() => {
      process.stdout.write(
        `\r${this.frames[this.currentIndex]} Fetching tasks...`
      );
      this.currentIndex = (this.currentIndex + 1) % this.frames.length;
    }, this.interval);
  }

  stop() {
    clearInterval(this.intervalId);
    process.stdout.write('\r');
  }
}

async function login(email, password) {
  try {
    const { data } = await axios({
      url: 'https://paramgaming.com/api/v1/user/login',
      method: 'POST',
      data: {
        email,
        password,
      },
    });

    return data.user.token;
  } catch (error) {
    console.log('Error in login: '.red, error.response.data.message);
    return null;
  }
}

async function getTasks(accessToken) {
  const spinner = new Spinner();
  try {
    spinner.start();

    const { data } = await axios({
      method: 'POST',
      url: 'https://paramgaming.com/api/v1/user/getUserTasks',
      headers: {
        Authorization: accessToken,
      },
    });

    spinner.stop();
    console.log('\nTasks fetched successfully.'.green);

    const incompleteTasks = data.data.filter(
      (task) => !task.taskCompleted && !task.taskClaimed
    );
    const incompleteTaskIds = incompleteTasks.map((task) => task.taskId);

    console.log(
      'Incomplete Task IDs:'.cyan,
      incompleteTaskIds.length > 0 ? incompleteTaskIds.join(', ') : 0
    );

    for (const taskId of incompleteTaskIds) {
      try {
        await clearTask(taskId, accessToken);
        await claimTask(taskId, accessToken);
      } catch (error) {
        console.log(
          `Error handling task with ID ${taskId}:`.red,
          error.message
        );
      }
    }

    console.log('All tasks processed successfully.'.green);
  } catch (error) {
    spinner.stop();
    console.log('\nError:'.red, error);
  }
}

async function clearTask(taskId, accessToken) {
  try {
    await axios.post(
      'https://paramgaming.com/api/v1/user/executeTask',
      { taskId },
      { headers: { Authorization: accessToken } }
    );
    console.log('Clear task success for task ID:'.green, taskId);
  } catch (error) {
    console.log(`Error clearing task ${taskId}:`.red, error.message);
  }
}

async function claimTask(taskId, accessToken) {
  try {
    await axios.post(
      'https://paramgaming.com/api/v1/user/claimTaskRewards',
      { taskId },
      { headers: { Authorization: accessToken } }
    );
    console.log('Claim task success for task ID:'.green, taskId);
  } catch (error) {
    console.log(
      `Error claiming task rewards for task ID ${taskId}:`.red,
      error.message
    );
  }
}

async function processAccounts() {
  // Retrieve accounts from environment variables
  const accounts = [];

  for (let i = 1; ; i++) {
    const email = process.env[`ACCOUNT_${i}_EMAIL`];
    const password = process.env[`ACCOUNT_${i}_PASSWORD`];

    if (!email || !password) break;

    accounts.push({ email, password });
  }

  // Process tasks for each account
  for (const { email, password } of accounts) {
    console.log(`Processing tasks for account: ${email}`);
    try {
      const accessToken = await login(email, password);
      if (accessToken) {
        await getTasks(accessToken);
      } else {
        console.log(`Login failed for account ${email}. Unable to retrieve access token.`.red);
      }
    } catch (error) {
      console.log(`Error processing account ${email}:`.red, error);
    }
  }
}

// Start processing accounts
processAccounts();
