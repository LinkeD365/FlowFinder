import { observer } from "mobx-react";
import * as React from "react";

import { SolutionMeta } from "../model/viewModel";
import { dvService } from "../services/dataverseService";
import { Field, SearchBox } from "@fluentui/react-components";

type SearchSolutionProps = {
  dvSvc: dvService;
  selected?: string;
  updateSelected: (solution: SolutionMeta) => void;
  currentSolutions: SolutionMeta[];
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

export const SearchSolution = observer((props: SearchSolutionProps): React.JSX.Element => {
  const { dvSvc, onLog, currentSolutions } = props;

  const [query, setQuery] = React.useState("");
  const [loadingText, setLoadingText] = React.useState("Loading...");

  const [results, setResults] = React.useState<SolutionMeta[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);
  const debounceValue = useDebounce(query, 300);

  React.useEffect(() => {
    if (query && query.length >= 1) {
      onLog(`Debounced search query: ${query}`, "info");
      searchSolutions(query);
    }
  }, [debounceValue]);

  const searchSolutions = async (searchQuery: string) => {
    onLog(`Searching for solutions with query: ${searchQuery}`, "info");
    setQuery(searchQuery);
    setIsLoading(true);
    setLoadingText("Searching...");
    await dvSvc
      .searchSolutions(searchQuery)
      .then((response) => {
        if (response.filter((item) => currentSolutions.every((result) => result.id !== item.id)).length === 0) {
          setLoadingText("No results found");
        } else {
          setIsLoading(false);
          setResults(response.filter((item) => currentSolutions.every((result) => result.id !== item.id)));
        }
      })
      .catch((error) => {
        onLog(`Error fetching search results: ${error}`, "error");
        setIsLoading(false);
      });
  };

  const handleSelectItem = (id: string, name: string, uniqueName: string, managed: boolean) => {
    setSelectedItem(id);
    setQuery("");
    setResults([]);
    props.updateSelected(new SolutionMeta(name, uniqueName, id, managed));
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
              onClick={() => handleSelectItem(item.id, item.name, item.uniqueName, item.managed)}
              style={{
                cursor: "pointer",
                backgroundColor: selectedItem === item.id ? "#f0f0f0" : "transparent",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
