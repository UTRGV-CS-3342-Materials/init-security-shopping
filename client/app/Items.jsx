import { Link } from 'react-router';

// One row of the table is worth its own component: it is a function,
// so it can be named, moved, and tested on its own.
function ItemRow({ item }) {
	return (
		<>
			<tr>
				<td rowSpan={2}>
					<img className="thumb" src={item.image_url} />
				</td>
				<td>
					<span className="name">
						<Link to={`/item_view/${item.id}`}>{item.name}</Link>
					</span>
				</td>
				<td className="price">${item.cost}</td>
			</tr>
			<tr>
				<td colSpan={2}>{item.description}</td>
			</tr>
		</>
	);
}

export function Items({ items }) {
	return (
		<>
			<div className="pb-2 mt-4 mb-2">
				<h1>Buy More!</h1>
			</div>

			<div className="row col-8">
				<table className="table">
					<thead>
						<tr>
							<th></th>
							<th>Name</th>
							<th className="price">Price</th>
						</tr>
					</thead>
					<tbody>
						{/* the EJS for-loop becomes a map: a function applied to every row.
						    `key` tells React which output belongs to which input. */}
						{items.map((item) => (
							<ItemRow key={item.id} item={item} />
						))}
					</tbody>
				</table>
			</div>
		</>
	);
}
