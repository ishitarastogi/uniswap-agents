import {
  Finding,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  getEthersProvider,
  ethers,
  HandleTransaction,
} from "forta-agent";
import { providers } from "ethers";

import util from "./utils";
import bignumber from "bignumber.js";

const UNIToken: string = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const GovernanceBravo: string = "0x408ED6354d4973f66138C91495F2f2FCbd8724C3";

const PROPSERS_MAP: Map<number, string> = new Map();
export const createFinding = (
  id: number,
  proposer: string,
  map: any,
  proposalThresholdValue: bignumber,
  getPriorVotes: bignumber
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
      proposer: proposer.toString(),
      map: map,
      proposalThresholdValue: proposalThresholdValue.toString(),
      getPriorVotes: getPriorVotes.toString(),
    },
  });
};

export function provideHandleTransaction(
  uniToken: string,
  governanceBravo: string,
  provider: providers.Provider
): HandleTransaction {
  const uniContract = new ethers.Contract(
    uniToken,
    util.GET_PRIOR_VOTES,
    provider
  );
  const governanceBravoContract = new ethers.Contract(
    governanceBravo,
    util.PROPOSAL_THRESHOLD,
    provider
  );

  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];
    const proposalCreatedEvent = txEvent.filterLog(
      util.PROPOSAL_CREATED,
      governanceBravo
    );

    // const proposalQueuedEvent = txEvent.filterLog(
    //   util.PROPOSAL_QUEUED,
    //   governanceBravo
    // );
    // await Promise.all(
    //   proposalQueuedEvent.map(async (event) => {
    //     const id: number = event.args.id;
    //     if (PROPSERS_MAP.has(id)) {
    //       PROPSERS_MAP.delete(id);
    //     }
    //   })
    // );
    await Promise.all(
      proposalCreatedEvent.map(async (event) => {
        const id: number = event.args.id;
        const proposer: string = event.args.proposer;
        const idPresent = PROPSERS_MAP.has(id);

        if (idPresent == false) {
          PROPSERS_MAP.set(id, proposer);
        }
        const idPresents = PROPSERS_MAP.get(id);

        const getPriorVotes: bignumber = await uniContract.getPriorVotes(
          proposer,

          txEvent.blockNumber - 1,
          {
            blockTag: txEvent.blockNumber,
          }
        );
        const proposalThresholdValue: bignumber =
          await governanceBravoContract.proposalThreshold({
            blockTag: txEvent.blockNumber,
          });
        if (getPriorVotes.lt(proposalThresholdValue)) {
          const newFinding: Finding = createFinding(
            id,
            proposer,
            idPresents,
            proposalThresholdValue,
            getPriorVotes
          );
          PROPSERS_MAP.delete(id);

          findings.push(newFinding);
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
