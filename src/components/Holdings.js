import React, { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = "https://zerodha-backend-o227.onrender.com";

const Holdings = () => {
  const [holdings, setHoldings] = useState([]);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let isMounted = true;

    const fetchHoldings = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/allHoldings`);

        if (isMounted) {
          setHoldings(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching holdings:", error);
      }
    };

    const getWebSocketUrl = () => {
      if (window.location.hostname === "localhost") {
        return "ws://localhost:3002";
      }

      return BACKEND_URL.replace("https://", "wss://");
    };

    const connectSocket = () => {
      try {
        socket = new WebSocket(getWebSocketUrl());

        socket.onopen = () => {
          console.log("Holdings live price WebSocket connected");

          const symbols = holdings
            .map((holding) => holding.name)
            .filter(Boolean);

          if (symbols.length > 0) {
            socket.send(
              JSON.stringify({
                type: "subscribe",
                symbols,
              })
            );
          }
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type !== "prices") return;

            const livePrices = Array.isArray(message.data)
              ? message.data
              : [];

            if (!isMounted) return;

            setHoldings((prev) =>
              prev.map((holding) => {
                const updated = livePrices.find(
                  (price) =>
                    String(price.symbol || "").toUpperCase() ===
                    String(holding.name || "").toUpperCase()
                );

                if (!updated) {
                  return holding;
                }

                return {
                  ...holding,
                  price: updated.price ?? holding.price,
                  ltp: updated.ltp ?? updated.price ?? holding.ltp,
                  change: updated.change ?? holding.change,
                  changePercent:
                    updated.changePercent ?? holding.changePercent,
                  day:
                    updated.day ??
                    `${Number(
                      updated.changePercent || 0
                    ).toFixed(2)}%`,
                  isLoss:
                    updated.isLoss ??
                    Number(updated.changePercent || 0) < 0,
                };
              })
            );
          } catch (error) {
            console.error("Invalid holdings price message:", error);
          }
        };

        socket.onerror = (error) => {
          console.error("Holdings WebSocket error:", error);
        };

        socket.onclose = () => {
          console.log("Holdings WebSocket disconnected");

          if (!isMounted) return;

          reconnectTimer = setTimeout(() => {
            connectSocket();
          }, 3000);
        };
      } catch (error) {
        console.error("Holdings WebSocket connection error:", error);

        reconnectTimer = setTimeout(() => {
          if (isMounted) {
            connectSocket();
          }
        }, 3000);
      }
    };

    const initialize = async () => {
      await fetchHoldings();

      if (isMounted) {
        connectSocket();
      }
    };

    initialize();

    return () => {
      isMounted = false;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (socket) {
        socket.close();
      }
    };
  }, []);

  return (
    <>
      <h3 className="title">Holdings ({holdings.length})</h3>

      <div className="order-table">
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Qty.</th>
              <th>Avg. cost</th>
              <th>LTP</th>
              <th>Cur. val</th>
              <th>P&amp;L</th>
              <th>Net chg.</th>
            </tr>
          </thead>

          <tbody>
            {holdings.map((holding, index) => {
              const qty = Number(holding.qty || 0);
              const avg = Number(holding.avg || 0);
              const price = Number(
                holding.price ?? holding.ltp ?? 0
              );

              const currentValue = qty * price;
              const investedValue = qty * avg;
              const pnl = currentValue - investedValue;

              const changePercent =
                holding.changePercent !== undefined
                  ? Number(holding.changePercent)
                  : investedValue
                  ? (pnl / investedValue) * 100
                  : 0;

              return (
                <tr key={holding.name || index}>
                  <td>{holding.name}</td>

                  <td>{qty}</td>

                  <td>₹{avg.toFixed(2)}</td>

                  <td>
                    <span
                      className={
                        changePercent < 0 ? "down" : "up"
                      }
                    >
                      ₹{price.toFixed(2)}
                    </span>
                  </td>

                  <td>₹{currentValue.toFixed(2)}</td>

                  <td>
                    <span
                      className={pnl < 0 ? "down" : "up"}
                    >
                      ₹{pnl.toFixed(2)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        changePercent < 0 ? "down" : "up"
                      }
                    >
                      {changePercent.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="row">
        <div className="col">
          <h5>₹{holdings.reduce(
            (total, holding) =>
              total +
              Number(holding.qty || 0) *
                Number(holding.avg || 0),
            0
          ).toFixed(2)}</h5>
          <p>Total investment</p>
        </div>

        <div className="col">
          <h5>
            ₹{holdings.reduce(
              (total, holding) =>
                total +
                Number(holding.qty || 0) *
                  Number(
                    holding.price ??
                      holding.ltp ??
                      holding.avg ??
                      0
                  ),
              0
            ).toFixed(2)}
          </h5>
          <p>Current value</p>
        </div>

        <div className="col">
          <h5
            className={
              holdings.reduce(
                (total, holding) => {
                  const qty = Number(holding.qty || 0);
                  const avg = Number(holding.avg || 0);
                  const price = Number(
                    holding.price ??
                      holding.ltp ??
                      holding.avg ??
                      0
                  );

                  return total + qty * (price - avg);
                },
                0
              ) < 0
                ? "down"
                : "up"
            }
          >
            ₹{holdings.reduce(
              (total, holding) => {
                const qty = Number(holding.qty || 0);
                const avg = Number(holding.avg || 0);
                const price = Number(
                  holding.price ??
                    holding.ltp ??
                    holding.avg ??
                    0
                );

                return total + qty * (price - avg);
              },
              0
            ).toFixed(2)}
          </h5>
          <p>P&amp;L</p>
        </div>
      </div>
    </>
  );
};

export default Holdings;