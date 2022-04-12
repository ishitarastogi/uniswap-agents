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

import { provideHandleTransaction } from "./agent";
import { utils, BigNumber } from "ethers";
import util from "./utils";
import { Interface } from "@ethersproject/abi";
const createFinding = ([id, proposer]: string[]): Finding =>
  Finding.fromObject({
    name: "Low Proposer Balance",
    description: "Low Proposer’s Uni Balance During Voting Period",
    alertId: "UNISWAP-15",
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    protocol: "UNISWAP",
    metadata: {
      id: id,
      proposer: proposer,
    },
  });

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

  it("should return no Findings due to incorrect event signature", async () => {
    const id: number = 98;
    const proposer: string = "0x683a4f9915d6216f73d6df50151725036bd26c02";
    const targets: string[] = ["0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8"];
    const values: number[] = [0, 0];
    const signatures: string[] = [
      "transfer(address recipient, uint256 amount)",
    ];

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
    const badWorkSig: string = "wrong()";

    const txEvent: TransactionEvent = new TestTransactionEvent()
      .setBlock(50)
      .addEventLog(badWorkSig, testGovernanceBravo, data, ...topics.slice(1));

    const findings = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([]);
  });
  it("should return no findings for incorrect address", async () => {
    const wrongTestGovernanceBravo: string = createAddress("0xd34d");
    const id: string = "98";
    const proposer: string = "0x683a4f9915d6216f73d6df50151725036bd26c02";
    const targets: string[] = ["0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8"];
    const values: number[] = [0, 0];
    const signatures: string[] = [
      "transfer(address recipient, uint256 amount)",
    ];

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

    const txEvent: TransactionEvent = new TestTransactionEvent()
      .setBlock(50)
      .addAnonymousEventLog(wrongTestGovernanceBravo, data, ...topics);

    const findings = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([]);
  });

  it("should return multiple findings", async () => {
    const targets: string[] = ["0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8"];
    const values: number[] = [0, 0];
    const signatures: string[] = [
      "transfer(address recipient, uint256 amount)",
    ];

    const calldatas: any[] = [
      "0xa9059cbb000000000000000000000000ab8483f64d9c6d1ecf9b849ae677dd3315835cb2000000000000000000000000000000000000000000000000000000003b9aca00",
    ];
    const startBlock: number = 14;
    const endBlock: number = 14549129;
    const description: string = "Proposal #1: Give grant to team";

    const TEST_DATA: string[][] = [
      ["98", createAddress("0xabc168")],
      ["99", createAddress("0xabc348")],
      ["100", createAddress("0xabc248")],
    ];
    const txEvent: TestTransactionEvent = new TestTransactionEvent().setBlock(
      50
    );

    for (let [id, proposer] of TEST_DATA) {
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

      txEvent.addAnonymousEventLog(testGovernanceBravo, data, ...topics);
    }

    const findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([
      createFinding(TEST_DATA[0]),
      createFinding(TEST_DATA[1]),
      createFinding(TEST_DATA[2]),
    ]);
  });
  it("should return no findings when getPriorVotes is greater than proposalThreshold", async () => {
    const targets: string[] = ["0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8"];
    const values: number[] = [0, 0];
    const signatures: string[] = [
      "transfer(address recipient, uint256 amount)",
    ];

    const calldatas: any[] = [
      "0xa9059cbb000000000000000000000000ab8483f64d9c6d1ecf9b849ae677dd3315835cb2000000000000000000000000000000000000000000000000000000003b9aca00",
    ];
    const startBlock: number = 14;
    const endBlock: number = 14549129;
    const description: string = "Proposal #1: Give grant to team";

    const TEST_DATA: string[][] = [
      ["98", createAddress("0xabc168"), BigNumber.from(1).toString()],
      ["99", createAddress("0xabc348"), BigNumber.from(100).toString()],
      ["100", createAddress("0xabc248"), BigNumber.from(1000).toString()],
    ];
    const txEvent: TestTransactionEvent = new TestTransactionEvent().setBlock(
      50
    );
    for (let [id, proposer, votes] of TEST_DATA) {
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
        outputs: [votes],
      });

      mockProvider.addCallTo(
        testUni,
        50,
        testProposalThresholdInterface,
        "proposalThreshold",
        {
          inputs: [],
          outputs: [BigNumber.from(100).toString()],
        }
      );

      txEvent.addAnonymousEventLog(testGovernanceBravo, data, ...topics);
    }
    const findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([createFinding(TEST_DATA[0])]);
  });
});
