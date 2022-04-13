"use strict";

/*

* The Transactions Database is assumed to be running indirectly through the Transactions Data Service
* The Transactions Data Service provides a REST Interface to a Postgrest Servcer. The current design of the
  watcher requires the URL of this service and it's userd by the KrakenTransactionsDataServiceClient.
* The KrakenTransactionsDataServiceClient makes bulk updates to the Transactions Database through the data service client,
  after it has received the parsed transactions from the KrakenValidDepositsByAddressParser.
* The KrakenValidDepositsByAddressParser implements the filtering solution discussed in the requirements and can be
  used for any other custom filtering of the data, sorting, and making sure the data is unique before storing on the database.
  It receives the data from the KrakenTransactionsFileWatcher, which is watching the filesystem for data.
* The KrakenTransactionsFileWatcher proxies live notifications of data stored in the volume and lists all the transaction
  files from the provided data location.

                          ┌───────────────────────────┐            ┌──────────────────────────────┐
                          ├───────────────────────────┤            │                              │
                          │ Transactions     POSTGRES │            │                              │
                          │  Database           ┌─────┤            │                              │
                          │                     │ 5432│◄───────────┤  Transactions Data Service   │
                          │ - users             └─────┤            │                              │
                          │ - wallets                 │            │      postgREST Server ┌──────┤
                          │ - wallets_x_users         │            │                       │ 4565 │
                          │ - wallet_transactions     │            └───────────────────────┴─▲────┘
                          │ - transactions_aggregates │                                      │
                          └───────────────────────────┘               CRUD         ┌─────────┘
                                                                                   │
                ┌─────────────────────────┬────────────────────────────────────────┼───────────────┐
                │ Transactions Data File  │                                        │               │
                │    Watcher Container    │                                        │               │
                ├─────────────────────────┘   ┌────────────────────────────────────┼───┐           │
                │                             ├────────────────────────────────────────┤           │
Env vars Config │                             │                                        ├─────────┐ │
  Injected      │                             │  KrakenTransactionsDataServiceClient   │         │ │
                │                             │                                        │         │ │
   │   │   │    │                             └────────────────────────────────────────┘         │ │
   │   │   │    │                                                                                │ │
   └───┴───┴────┼─────┬────┬────┐             ┌───────────────────────────────────────┐          │ │
                │     │    │    │             ├───────────────────────────────────────┤          │ │
                │   ┌─▼────▼────▼┐            │                                       │          │ │
                │   │ config     │            │   KrakenValidDepositsByAddressParser  ├───────┐  │ │
                │   │            │            │                                       │       │  │ │
                │   └──────┬─────┘            └───────────────────────────────────────┘       │  │ │
                │          │                                                                  │  │ │
                │          │                    ┌────────────────────────────────────┐        │  │ │
                │   ┌──────┴──────┐             ├────────────────────────────────────┤        │  │ │
                │   │             │             │                                    │        │  │ │
                │   │ service.js  ◄─────────────┤   KrakenTransactionsFileWatcher    ◄────────┘  │ │
                │   │             │             │                                    │           │ │
                │   └──────┬──────┘             │                                    ◄───────────┘ │
                │          │                    └───────────────────┬────────────────┘             │
                │          │                                        │                              │
                │          │                                        │                              │
                │          │                                        │                              │
                │          │                                        │                              │
                │          │                                        │                              │
                │     ┌────▼────────────────────┬───────────────────▼──────────────────────┐       │
                │     │                         │                                          │       │
                │     │   Healthcheck file      │        Transactions Data volume (files)  │       │
                └─────┴─────────────────────────┴──────────────────────────────────────────┴───────┘
 */

// Load the config instance based on the environment
const configInstance = require("./kraken/platform/util/config")

// Load the classes
const KrakenTransactionsFileWatcher = require("./kraken/platform/blockchain/bitcoin/transactions/KrakenTransactionsFileWatcher")
const KrakenValidDepositsByAddressParser = require("./kraken/platform/blockchain/bitcoin/transactions/KrakenValidDepositsByAddressParser")
const KrakenTransactionsDataServiceClient = require("./kraken/platform/blockchain/bitcoin/transactions/KrakenTransactionsDataServiceClient")

// Provide the file transactions watcher
new KrakenTransactionsFileWatcher({
    config: configInstance,
    transactionsParser: new KrakenValidDepositsByAddressParser({config: configInstance}),
    dataServiceClient:  new KrakenTransactionsDataServiceClient({config: configInstance})
});
