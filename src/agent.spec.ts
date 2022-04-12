import {
  Finding,
  FindingSeverity,
  FindingType,
  HandleTransaction,
  TransactionEvent,
  getEthersProvider,
} from "forta-agent";
import {
  createAddress,
  TestTransactionEvent,
  MockEthersProvider,
} from "forta-agent-tools/lib/tests";
import { providers } from "ethers";

import { encodeParameters } from "forta-agent-tools";
import { leftPad } from "web3-utils";
const toBytes32 = (n: string) => leftPad(BigNumber.from(n).toHexString(), 64);

import { provideHandleTransaction } from "./agent";
import { utils, BigNumber } from "ethers";
import util from "./utils";
import { Interface } from "@ethersproject/abi";
const createFinding = (
  id: any,
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
      id: id,
      proposer: proposer,
      proposalThresholdValue: proposalThresholdValue.toString(),
      getPriorVotes: getPriorVotes.toString(),
    },
  });
};

const testUni: string = createAddress("0xdef1");
const testGovernanceBravo: string = createAddress("0xdef1");
const testProposalCreateInterface: Interface = new utils.Interface([
  util.PROPOSAL_CREATED,
]);
const testProposalThresholdInterface: Interface = new utils.Interface(
  util.PROPOSAL_THRESHOLD
);
const testGetPriorVotes: Interface = new utils.Interface(util.GET_PRIOR_VOTES);

describe("Uniswap agents", () => {
  let tx: TransactionEvent;
  let handleTransaction: HandleTransaction;
  const mockProvider = new MockEthersProvider();
  beforeAll(() => {
    handleTransaction = provideHandleTransaction(
      testUni,
      testGovernanceBravo,
      mockProvider as any
    );
  });
  beforeEach(() => mockProvider.clear());

  it("should ignore empty transactions", async () => {
    const tx: TransactionEvent = new TestTransactionEvent();

    const findings: Finding[] = await handleTransaction(tx);
    expect(findings).toStrictEqual([]);
  });
  it("should return a finding", async () => {
    const id: number = 98;
    const proposer: string = "0x683a4f9915d6216f73d6df50151725036bd26c02";
    const targets: string[] = ["0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8"];
    const values: number[] = [0, 0];
    const signatures: string[] = [
      "transfer(address recipient, uint256 amount)",
    ];
    // const testData: any = encodeParameters(
    //   ["string", "bignumber"],
    //   ["testFlag", 78997]
    // );
    const calldatas: any[] = [
      "0xa9059cbb000000000000000000000000ab8483f64d9c6d1ecf9b849ae677dd3315835cb2000000000000000000000000000000000000000000000000000000003b9aca00",
    ];
    const startBlock: number = 14;
    const endBlock: number = 14549129;
    const description: string = "Proposal #1: Give grant to team";
    const { data, topics } = testProposalCreateInterface.encodeEventLog(
      testProposalCreateInterface.getEvent("ProposalCreated"),
      [
        id,
        proposer,
        targets,
        values,
        signatures,
        calldatas,
        startBlock,
        endBlock,
        description,
      ]
    );

    mockProvider.addCallTo(testUni, 50, testGetPriorVotes, "getPriorVotes", {
      inputs: [proposer, 49],
      outputs: [10],
    });
    // // console.log("findings1");

    mockProvider.addCallTo(
      testUni,
      50,
      testProposalThresholdInterface,
      "proposalThreshold",
      {
        inputs: [],
        outputs: [100],
      }
    );
    // console.log("findings2");

    const txEvent: TransactionEvent = new TestTransactionEvent()
      .setBlock(50)
      .addAnonymousEventLog(testGovernanceBravo, data, ...topics);
    console.log(txEvent);
    console.log("finding3");

    const findings = await handleTransaction(txEvent);

    console.log("finding4");

    console.log(findings);
    // expect(findings).toStrictEqual([]);
  });
});
