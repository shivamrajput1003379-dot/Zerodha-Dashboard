import React, { useState, useContext, useEffect } from "react";
import { Tooltip, Grow } from "@mui/material";
import {
  BarChartOutlined,
  KeyboardArrowDown,
  KeyboardArrowUp,
  MoreHoriz,
} from "@mui/icons-material";
import { watchlist as staticWatchlist } from "../data/data";
import GeneralContext from "./GeneralContext";
import { DoughnutChart } from "./DoughnoutChart";

const BACKEND_URL = "https://zerodha-backend-o227.onrender.com";

const getWebSocketUrl = () => {
  if (window.location.hostname === "localhost") {
    return "ws://localhost:3002";
  }

  if (window.location.protocol === "https:") {
    return BACKEND_URL.replace("https://", "wss://");
  }

  return BACKEND_URL.replace("https://", "ws://");
};

const WatchList = () => {
  const [liveWatchlist, setLiveWatchlist] = useState(staticWatchlist);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let isMounted = true;

    const connectSocket = () => {
      try {
        socket = new WebSocket(getWebSocketUrl());

        socket.onopen = () => {
          console.log("Live price WebSocket connected");

          const symbols = staticWatchlist
            .map((stock) => stock.name)
            .filter(Boolean);

          socket.send(
            JSON.stringify({
              type: "subscribe",
              symbols,
            })
          );
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type !== "prices") {
              return;
            }

            const livePrices = Array.isArray(message.data)
              ? message.data
              : [];

            if (!isMounted) return;

            setLiveWatchlist((prev) =>
              prev.map((stock) => {
                const updated = livePrices.find(
                  (price) =>
                    String(price.symbol || "").toUpperCase() ===
                    String(stock.name || "").toUpperCase()
                );

                if (!updated) {
                  return stock;
                }

                return {
                  ...stock,

                  // Live LTP
                  price: updated.price ?? stock.price,

                  // Existing UI percentage field
                  percent:
                    updated.day ??
                    `${Number(updated.changePercent || 0).toFixed(2)}%`,

                  // Existing UI direction field
                  isDown:
                    updated.isLoss ??
                    Number(updated.changePercent || 0) < 0,

                  // Extra live values
                  change: updated.change ?? stock.change,
                  changePercent:
                    updated.changePercent ?? stock.changePercent,
                  ltp: updated.ltp ?? updated.price ?? stock.ltp,
                };
              })
            );
          } catch (error) {
            console.error("Invalid live price message:", error);
          }
        };

        socket.onerror = (error) => {
          console.error("Live price WebSocket error:", error);
        };

        socket.onclose = () => {
          console.log("Live price WebSocket disconnected");

          if (!isMounted) return;

          // Automatically reconnect after 3 seconds
          reconnectTimer = setTimeout(() => {
            connectSocket();
          }, 3000);
        };
      } catch (error) {
        console.error("WebSocket connection error:", error);

        reconnectTimer = setTimeout(() => {
          if (isMounted) {
            connectSocket();
          }
        }, 3000);
      }
    };

    connectSocket();

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

  const labels = liveWatchlist.map((subArray) => subArray["name"]);

  const data = {
    labels,
    datasets: [
      {
        label: "Price",
        data: liveWatchlist.map((stock) => stock.price),
        backgroundColor: [
          "rgba(255, 99, 132, 0.5)",
          "rgba(54, 162, 235, 0.5)",
          "rgba(255, 206, 86, 0.5)",
          "rgba(75, 192, 192, 0.5)",
          "rgba(153, 102, 255, 0.5)",
          "rgba(255, 159, 64, 0.5)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="watchlist-container">
      <div className="search-container">
        <input
          type="text"
          name="search"
          id="search"
          placeholder="Search eg:infy, bse, nifty fut weekly, gold mcx"
          className="search"
        />
        <span className="counts"> {liveWatchlist.length} / 50</span>
      </div>

      <ul className="list">
        {liveWatchlist.map((stock, index) => {
          return (
            <WatchListItem
              stock={stock}
              key={stock.name || index}
            />
          );
        })}
      </ul>

      <DoughnutChart data={data} />
    </div>
  );
};

const WatchListItem = ({ stock }) => {
  const [showWatchlistActions, setShowWatchlistActions] = useState(false);

  return (
    <li
      onMouseEnter={() => setShowWatchlistActions(true)}
      onMouseLeave={() => setShowWatchlistActions(false)}
    >
      <div
        className={`item ${
          showWatchlistActions ? "item-hovered" : ""
        }`}
      >
        <p className={stock.isDown ? "down" : "up"}>
          {stock.name}
        </p>

        <div className="item-info">
          <span className="percent">
            {stock.percent}
          </span>

          {stock.isDown ? (
            <KeyboardArrowDown className="down" />
          ) : (
            <KeyboardArrowUp className="up" />
          )}

          <span className="price">
            {stock.price}
          </span>
        </div>
      </div>

      {showWatchlistActions && (
        <WatchListActions uid={stock.name} />
      )}
    </li>
  );
};

const WatchListActions = ({ uid }) => {
  const { openBuyWindow } = useContext(GeneralContext);

  return (
    <span className="actions">
      <span>
        <Tooltip
          title="Buy (B)"
          placement="top"
          arrow
          TransitionComponent={Grow}
        >
          <button
            className="buy"
            onClick={() => openBuyWindow(uid)}
          >
            Buy
          </button>
        </Tooltip>

        <Tooltip
          title="Sell (S)"
          placement="top"
          arrow
          TransitionComponent={Grow}
        >
          <button className="sell">
            Sell
          </button>
        </Tooltip>

        <Tooltip
          title="Analytics (A)"
          placement="top"
          arrow
          TransitionComponent={Grow}
        >
          <button className="action">
            <BarChartOutlined className="icon" />
          </button>
        </Tooltip>

        <Tooltip
          title="More"
          placement="top"
          arrow
          TransitionComponent={Grow}
        >
          <button className="action">
            <MoreHoriz className="icon" />
          </button>
        </Tooltip>
      </span>
    </span>
  );
};

export default WatchList;