import { observer } from "mobx-react";
import * as React from "react";

import { OwnerMeta, ViewModel } from "../model/viewModel";
import { dvService } from "../services/dataverseService";
import { Field, SearchBox } from "@fluentui/react-components";
import { PeopleTeam16Filled, Person12Filled } from "@fluentui/react-icons";

type SearchBoxProps = {
  dvSvc: dvService;
  vm: ViewModel;
  selected?: string;
  updateSelected: (owner: OwnerMeta) => void;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
};

function useDebounce(cb: string, delay: number) {
  const [debounceValue, setDebounceValue] = React.useState(cb);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebounceValue(cb);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [cb, delay]);
  return debounceValue;
}

export const SearchBoxCtl = observer((props: SearchBoxProps): React.JSX.Element => {
  const { dvSvc, vm, selected, onLog } = props;

  const [query, setQuery] = React.useState("");
  const [loadingText, setLoadingText] = React.useState("Loading...");
  const [debounceVal, setDebounceVal] = React.useState("");

  const [results, setResults] = React.useState<OwnerMeta[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);
  const debounceValue = useDebounce(query, 300);

  React.useEffect(() => {
    if (query || query.length >= 1) {
      console.log("Debounced:", query);
      searchOwners(query);
      setDebounceVal(query);
    }
  }, [debounceValue]);

  const searchOwners = async (searchQuery: string) => {
    console.log(`Searching for owners with query: ${searchQuery}`);
    setQuery(searchQuery);
    setIsLoading(true);
    setLoadingText("Searching...");
    await dvSvc
      .getUsersAndTeams(searchQuery)
      .then((response) => {
        if (response.filter((item) => vm.coOwners.every((coOwner) => coOwner.id !== item.id)).length === 0) {
          setLoadingText("No results found");
        } else {
          setIsLoading(false);
          setResults(response.filter((item) => vm.coOwners.every((coOwner) => coOwner.id !== item.id)));
        }
      })
      .catch((error) => {
        onLog(`Error fetching search results: ${error}`, "error");
        setIsLoading(false);
      });
  };

  const handleSelectItem = (id: string, name: string, type: "user" | "team") => {
    setSelectedItem(id);
    setQuery("");
    setResults([]);
    props.updateSelected(new OwnerMeta(name, id, type));
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <Field>
        <SearchBox placeholder="Search..." value={query} onChange={(_, data) => setQuery(data.value)} />
      </Field>
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: "200px",
            overflowY: "auto",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            zIndex: 1000,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          {loadingText || "Loading..."}
        </div>
      )}

      {results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: "200px",
            overflowY: "auto",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            zIndex: 1000,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectItem(item.id, item.name, item.type)}
              style={{
                cursor: "pointer",
                backgroundColor: selectedItem === item.id ? "#f0f0f0" : "transparent",
                display: "flex",
                alignItems: "center",
              }}
            >
              {item.type === "user" ? <Person12Filled /> : <PeopleTeam16Filled />}{" "}
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
