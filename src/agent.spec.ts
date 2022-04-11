import {
  Finding,
  FindingSeverity,
  FindingType,
  HandleTransaction,
  TransactionEvent,
} from "forta-agent";
import {
  createAddress,
  TestTransactionEvent,
  MockEthersProvider,
} from "forta-agent-tools/lib/tests";
import { provideHandleTransaction } from "./agent";
import { utils, BigNumber } from "ethers";
import util from "./utils";

const testUni: string = createAddress("0xdef1");
const testGovernanceBravo: string = createAddress("0xdef1");
const iface: utils.Interface = new utils.Interface([util.PROPOSAL_CREATED]);

describe("Uniswap agents", () => {
  const mockProvider = new MockEthersProvider();

  let handler: HandleTransaction = provideHandleTransaction(
    testUni,
    testGovernanceBravo,
    mockProvider as any
  );

  it("should ignore empty transactions", async () => {
    const tx: TransactionEvent = new TestTransactionEvent();

    const findings: Finding[] = await handler(tx);
    expect(findings).toStrictEqual([]);
  });
});
