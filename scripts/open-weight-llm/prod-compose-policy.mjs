const MODEL_REQUIRED_COMMANDS = new Set(['create', 'restart', 'run', 'start', 'up']);

export function shouldValidateOpenWeightLlmStart(argumentsToCompose) {
  return argumentsToCompose.some((argument) => MODEL_REQUIRED_COMMANDS.has(argument));
}
