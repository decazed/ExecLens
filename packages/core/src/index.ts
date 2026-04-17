import type { RuntimeAdapter, SimulationAbortSignal, SimulationRequest, SimulationResult } from "@execlens/protocol";

export async function simulateFunction(
  runtimeAdapter: RuntimeAdapter,
  request: SimulationRequest,
  signal?: SimulationAbortSignal
): Promise<SimulationResult> {
  return runtimeAdapter.run(request, signal);
}
