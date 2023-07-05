import {Queue} from "bullmq"

export async function addToQueue({queueName, jobName, jobData}) {

  const taskQueue = new Queue(queueName);

  return taskQueue.add(jobName, jobData);  
}
