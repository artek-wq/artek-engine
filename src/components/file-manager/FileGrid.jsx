import FileCard from "./FileCard";
export default function FileGrid({
    items,
    onOpen,
    onSelect,
    selectedItem
}) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6">
            {items.map((item) => (
                <FileCard
                    key={item.name}
                    item={item}
                    onOpen={onOpen}
                    onSelect={onSelect}
                    selected={selectedItem?.name === item.name}
                />
            ))}
        </div>
    );
}