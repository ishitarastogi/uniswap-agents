import {
  Finding,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  getEthersProvider,
  ethers,
} from "forta-agent";
import { providers } from "ethers";

import util from "./utils";

const UNIToken: string = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const GovernanceBravo: string = "0x408ED6354d4973f66138C91495F2f2FCbd8724C3";

const PROPSERS_MAP: Map<number, string> = new Map([]);
export const createFinding = (
  id: number,
  proposer: string,
  proposalThresholdValue: number,
  getPriorVotes: number
): Finding => {
  return Finding.fromObject({
    name: "Low Proposer Balance",
    description: "Low Proposer’s Uni Balance During Voting Period",
    alertId: "UNISWAP-15",
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    protocol: "UNISWAP",
    metadata: {
      id: id.toString(),
      proposer: proposer,
      proposalThresholdValue: proposalThresholdValue.toString(),
      getPriorVotes: getPriorVotes.toString(),
    },
  });
};

export function provideHandleTransaction(
  uniToken: string,
  governanceBravo: string,
  provider: providers.Provider
) {
  const uniContract = new ethers.Contract(
    uniToken,
    util.GET_PRIOR_VOTES,
    provider
  );
  const governanceBravoContract = new ethers.Contract(
    uniToken,
    util.PROPOSAL_THRESHOLD,
    provider
  );

  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];
    const proposalCreatedEvent = txEvent.filterLog(
      util.PROPOSAL_CREATED,
      governanceBravo
    );

    const proposalQueuedEvent = txEvent.filterLog(
      util.PROPOSAL_QUEUED,
      governanceBravo
    );
    await Promise.all(
      proposalQueuedEvent.map(async (event) => {
        const id: number = event.args.id;
        if (PROPSERS_MAP.has(id)) {
          PROPSERS_MAP.delete(id);
        }
      })
    );
    await Promise.all(
      proposalCreatedEvent.map(async (event) => {
        const id: number = event.args.id;
        const proposer: string = event.args.proposer;
        const blockNumber: number = txEvent.blockNumber;
        const idPresent = PROPSERS_MAP.has(id);
        if (idPresent === false) {
          PROPSERS_MAP.set(id, proposer);
        }
        const getPriorVotes = await uniContract.getPriorVotes(proposer, {
          blockTag: blockNumber - 1,
        });
        const proposalThresholdValue =
          await governanceBravoContract.proposalThreshold();
        if (getPriorVotes <= proposalThresholdValue) {
          const newFinding: Finding = createFinding(
            id,
            proposer,
            proposalThresholdValue,
            getPriorVotes
          );
          findings.push(newFinding);
          PROPSERS_MAP.delete(id);
        }
      })
    );

    return findings;
  };
}

export default {
  handleTransaction: provideHandleTransaction(
    UNIToken,
    GovernanceBravo,
    getEthersProvider()
  ),
};
