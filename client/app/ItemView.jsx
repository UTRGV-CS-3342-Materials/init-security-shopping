import { useState } from 'react';
import { Link } from 'react-router';
import { API_URL } from './api.js';

function Review({ review }) {
	return (
		// faded until the server confirms it
		<div className="card w-100 mt-3" style={{ opacity: review.pending ? 0.5 : 1 }}>
			<div className="card-header">
				<em>{review.author}</em>
			</div>
			<div className="card-body">
				<p>{review.content}</p>
			</div>
		</div>
	);
}

export function ItemView({ item, reviews }) {
	const [blank, setBlank] = useState({ author: false, content: false });

	function checkBlank(event) {
		const { name, value } = event.target;
		setBlank({ ...blank, [name]: value.trim() === '' });
	}

	// the list lives in client state now, so reviews can be added (and removed) without a reload
	const [list, setList] = useState(reviews);
	const [saveErrors, setSaveErrors] = useState([]);

	async function submitReview(event) {
		event.preventDefault();
		const form = event.currentTarget;
		const author = form.elements.author.value;
		const content = form.elements.content.value;

		// no point optimistically adding something we already know the server will reject
		const nowBlank = { author: author.trim() === '', content: content.trim() === '' };
		setBlank(nowBlank);
		if (nowBlank.author || nowBlank.content) return;

		// optimistic update: show the review right away with a temporary id, clear the form
		const tempId = `temp-${Date.now()}`;
		setList((current) => [{ id: tempId, author, content, pending: true }, ...current]);
		setSaveErrors([]);
		form.reset();

		// rollback: take the review back out and give the user their text back
		// (functional setList because other submits may have changed the list meanwhile)
		function rollback(errors) {
			setList((current) => current.filter((review) => review.id !== tempId));
			form.elements.author.value = author;
			form.elements.content.value = content;
			setSaveErrors(errors);
		}

		try {
			const response = await fetch(`${API_URL}/api/item_view/${item.id}/reviews`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ author, content }),
			});
			const body = await response.json();

			if (!response.ok) {
				rollback(body.errors);
				return;
			}

			// confirmed: swap the temporary review for the real one (real id, trimmed text)
			setList((current) => current.map((review) => (review.id === tempId ? body.review : review)));
		} catch {
			// network down, or the response wasn't JSON (e.g. a 500 error page)
			rollback(['Could not save your review. Please try again.']);
		}
	}

	const messages = [...saveErrors];
	if (blank.author) messages.push('Name is required.');
	if (blank.content) messages.push('Review is required.');

	return (
		<>
			<div className="pb-2 mt-4 mb-2 border-bottom">
				<h1>{item.name}</h1>
				<p>
					(<Link to="/items">back</Link>)
				</p>
			</div>

			<div className="row">
				<div className="col-4">
					<img className="img-fluid" src={item.image_url} />
				</div>
				<div className="col-4">
					<div>{item.description}</div>
					<div>
						<em>${item.cost}</em>
					</div>
				</div>
			</div>

			<div className="row my-4">
				<div className="col-8">
					<h3>Reviews</h3>
	
					<div className="card w-100 mt-3">
						<div className="card-body">
							{/* No method: there's no page route to POST to anymore. Without JavaScript,
							    nothing on this site works at all. */}
							<form onSubmit={submitReview}>
								{messages.length > 0 && (
									<div className="alert alert-danger">
										<ul className="mb-0">
											{messages.map((message) => (
												<li key={message}>{message}</li>
											))}
										</ul>
									</div>
								)}
								<div className="form-group">
									<label>Add your review!</label>
									<input
										className="form-control mb-1"
										placeholder="Name"
										name="author"
										onBlur={checkBlank}
									/>
								</div>
								<div className="form-group">
									<textarea
										className="form-control mb-1"
										placeholder="Review"
										name="content"
										onBlur={checkBlank}
									/>
								</div>
								<div className="form-group">
									<button type="submit" className="btn btn-primary">
										Submit
									</button>
								</div>
							</form>
						</div>
					</div>
					
					{list.map((review) => (
						<Review key={review.id} review={review} />
					))}
				</div>
			</div>
		</>
	);
}
