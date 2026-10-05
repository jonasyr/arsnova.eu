const MODEL_REQUIRED_COMMANDS = new Set(['create', 'restart', 'run', 'start', 'up']);

export function shouldVerifyOpenWeightLlmModel(argumentsToCompose) {
  return argumentsToCompose.some((argument) => MODEL_REQUIRED_COMMANDS.has(argument));
}
